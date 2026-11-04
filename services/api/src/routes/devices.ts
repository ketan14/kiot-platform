import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';
import { createDeviceSchema, updateDeviceSchema } from '@kiot/validation';
import { config } from '../config.js';

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // List devices for active organization with filtering
  app.get(
    '/v1/devices',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List devices with optional filtering by product, gateway, or status',
        tags: ['Devices'],
        querystring: {
          type: 'object',
          properties: {
            product: { type: 'string', enum: ['home', 'cold', 'industrial', 'energy'] },
            gateway_id: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'degraded', 'provisioning'] },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        product?: string;
        gateway_id?: string;
        status?: string;
        page?: number;
        limit?: number;
      };

      const page = Math.max(1, queryParams.page || 1);
      const limit = Math.min(100, Math.max(1, queryParams.limit || 20));
      const offset = (page - 1) * limit;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.product) {
          conditions.push(`product_id = $${paramIndex++}`);
          values.push(queryParams.product);
        }
        if (queryParams.gateway_id) {
          conditions.push(`gateway_id = $${paramIndex++}`);
          values.push(queryParams.gateway_id);
        }
        if (queryParams.status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(queryParams.status);
        }

        const whereClause = conditions.join(' AND ');

        // Count total
        const countQuery = `SELECT count(*) AS total FROM devices WHERE ${whereClause};`;
        const countResult = await client.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total, 10);

        // Fetch page
        const selectQuery = `
          SELECT id, product_id, gateway_id, location_id, name, hardware_type, hardware_serial,
                 firmware_version, status, last_seen_at, metadata, created_at, updated_at
          FROM devices
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;
        values.push(limit, offset);

        const result = await client.query(selectQuery, values);

        return {
          devices: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      });
    }
  );

  // Get device details by ID (including Device Shadow)
  app.get(
    '/v1/devices/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get device details and current Device Shadow (reported vs desired state)',
        tags: ['Devices'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT d.*, s.desired, s.reported, s.delta, s.version AS shadow_version
          FROM devices d
          LEFT JOIN device_shadows s ON d.id = s.device_id
          WHERE d.id = $1 AND d.organization_id = $2;
        `;
        const result = await client.query(query, [id, tenant.organizationId]);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Device not found' });
        }

        return { device: result.rows[0] };
      });
    }
  );

  // Onboard new device (Register hardware + Initial Shadow + Provisioning Credentials)
  app.post(
    '/v1/devices',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Onboard a new IoT device, provision initial shadow and generate MQTT endpoints',
        tags: ['Devices'],
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const parseResult = createDeviceSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          issues: parseResult.error.format(),
        });
      }

      const input = parseResult.data;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        // Check uniqueness of device ID
        const existingDevice = await client.query(
          'SELECT id FROM devices WHERE id = $1;',
          [input.id]
        );
        if (existingDevice.rowCount && existingDevice.rowCount > 0) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: `Device with ID '${input.id}' already exists.`,
          });
        }

        // Check uniqueness of hardware serial
        const existingSerial = await client.query(
          'SELECT id FROM devices WHERE hardware_serial = $1;',
          [input.hardwareSerial]
        );
        if (existingSerial.rowCount && existingSerial.rowCount > 0) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: `Device with serial number '${input.hardwareSerial}' already registered.`,
          });
        }

        // If locationId specified, verify it belongs to organization
        if (input.locationId) {
          const locCheck = await client.query(
            'SELECT id FROM locations WHERE id = $1 AND organization_id = $2;',
            [input.locationId, tenant.organizationId]
          );
          if (locCheck.rowCount === 0) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: `Location '${input.locationId}' does not exist in this organization.`,
            });
          }
        }

        // 1. Insert device record
        const insertDeviceQuery = `
          INSERT INTO devices (
            id, organization_id, product_id, gateway_id, location_id,
            name, hardware_type, hardware_serial, mac_address, firmware_version,
            status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'offline', $11)
          RETURNING *;
        `;
        const deviceResult = await client.query(insertDeviceQuery, [
          input.id,
          tenant.organizationId,
          input.productId,
          input.gatewayId || null,
          input.locationId || null,
          input.name,
          input.hardwareType,
          input.hardwareSerial,
          input.macAddress || null,
          input.firmwareVersion || '1.0.0',
          JSON.stringify(input.metadata || {}),
        ]);

        const device = deviceResult.rows[0];

        // 2. Insert initial empty device shadow
        await client.query(
          `INSERT INTO device_shadows (device_id, organization_id, desired, reported, delta, version)
           VALUES ($1, $2, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 1)
           ON CONFLICT (device_id) DO NOTHING;`,
          [device.id, tenant.organizationId]
        );

        // 3. Construct provisioning profile
        const brokerHost = config.EMQX_HOST || 'localhost';
        const brokerPort = config.EMQX_PORT || 1883;

        const provisioning = {
          mqtt: {
            brokerUrl: `mqtt://${brokerHost}:${brokerPort}`,
            clientId: `kiot-${device.id}`,
            telemetryTopic: `kiot/${tenant.organizationId}/devices/${device.id}/telemetry`,
            commandsTopic: `kiot/${tenant.organizationId}/devices/${device.id}/commands`,
            shadowGetTopic: `kiot/${tenant.organizationId}/devices/${device.id}/shadow/get`,
            shadowUpdateTopic: `kiot/${tenant.organizationId}/devices/${device.id}/shadow/update`,
          },
        };

        return reply.status(201).send({
          device,
          provisioning,
        });
      });
    }
  );

  // Update device metadata / location / gateway / status
  app.put(
    '/v1/devices/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Update device metadata, location, gateway assignment, or operational status',
        tags: ['Devices'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;
      const parseResult = updateDeviceSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          issues: parseResult.error.format(),
        });
      }

      const input = parseResult.data;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const updates: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [id, tenant.organizationId];
        let paramIndex = 3;

        if (input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(input.name);
        }
        if (input.locationId !== undefined) {
          updates.push(`location_id = $${paramIndex++}`);
          values.push(input.locationId);
        }
        if (input.gatewayId !== undefined) {
          updates.push(`gateway_id = $${paramIndex++}`);
          values.push(input.gatewayId);
        }
        if (input.firmwareVersion !== undefined) {
          updates.push(`firmware_version = $${paramIndex++}`);
          values.push(input.firmwareVersion);
        }
        if (input.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(input.status);
        }
        if (input.metadata !== undefined) {
          updates.push(`metadata = $${paramIndex++}`);
          values.push(JSON.stringify(input.metadata));
        }

        const query = `
          UPDATE devices
          SET ${updates.join(', ')}
          WHERE id = $1 AND organization_id = $2
          RETURNING *;
        `;

        const result = await client.query(query, values);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Device not found' });
        }

        return { device: result.rows[0] };
      });
    }
  );

  // Decommission / delete device
  app.delete(
    '/v1/devices/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Decommission and deregister an IoT device',
        tags: ['Devices'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          'DELETE FROM devices WHERE id = $1 AND organization_id = $2 RETURNING id;',
          [id, tenant.organizationId]
        );

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Device not found' });
        }

        return { success: true, message: `Device '${id}' successfully decommissioned.` };
      });
    }
  );

  // List Gateways
  app.get(
    '/v1/gateways',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List edge gateways registered in the organization',
        tags: ['Devices'],
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT id, name, model, ip_address, status, last_heartbeat_at, location_id, created_at
          FROM gateways
          WHERE organization_id = $1
          ORDER BY created_at DESC;
        `;
        const result = await client.query(query, [tenant.organizationId]);
        return { gateways: result.rows };
      });
    }
  );
}
