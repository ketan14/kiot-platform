import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';
import { createLocationSchema, updateLocationSchema } from '@kiot/validation';

interface LocationRecord {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  code: string | null;
  type: string;
  address: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  children?: LocationRecord[];
}

export async function locationRoutes(app: FastifyInstance): Promise<void> {
  // List locations for active organization (supports flat list or nested tree hierarchy)
  app.get(
    '/v1/locations',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List factory locations with optional tree hierarchy structure',
        tags: ['Locations'],
        querystring: {
          type: 'object',
          properties: {
            tree: { type: 'boolean', default: false },
            type: { type: 'string', enum: ['site', 'building', 'floor', 'line', 'room'] },
            parent_id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        tree?: boolean | string;
        type?: string;
        parent_id?: string;
      };

      const asTree = queryParams.tree === true || queryParams.tree === 'true';

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.type) {
          conditions.push(`type = $${paramIndex++}`);
          values.push(queryParams.type);
        }
        if (queryParams.parent_id) {
          conditions.push(`parent_id = $${paramIndex++}`);
          values.push(queryParams.parent_id);
        }

        const query = `
          SELECT id, organization_id, parent_id, name, code, type, address, created_at, updated_at
          FROM locations
          WHERE ${conditions.join(' AND ')}
          ORDER BY name ASC;
        `;

        const result = await client.query<LocationRecord>(query, values);
        const rows = result.rows;

        if (!asTree) {
          return { locations: rows };
        }

        // Build hierarchical tree
        const map = new Map<string, LocationRecord>();
        const roots: LocationRecord[] = [];

        rows.forEach((loc) => {
          map.set(loc.id, { ...loc, children: [] });
        });

        rows.forEach((loc) => {
          const node = map.get(loc.id)!;
          if (loc.parent_id && map.has(loc.parent_id)) {
            map.get(loc.parent_id)!.children!.push(node);
          } else {
            roots.push(node);
          }
        });

        return { locations: roots };
      });
    }
  );

  // Get location details by ID (including device & machine counts)
  app.get(
    '/v1/locations/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get location details by ID with direct child locations and assigned hardware counts',
        tags: ['Locations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const locQuery = `
          SELECT id, organization_id, parent_id, name, code, type, address, created_at, updated_at
          FROM locations
          WHERE id = $1 AND organization_id = $2;
        `;
        const locResult = await client.query(locQuery, [id, tenant.organizationId]);

        if (locResult.rowCount === 0) {
          return reply.status(404).send({ error: 'Location not found' });
        }

        // Fetch direct children
        const childrenQuery = `
          SELECT id, organization_id, parent_id, name, code, type, created_at, updated_at
          FROM locations
          WHERE parent_id = $1 AND organization_id = $2
          ORDER BY name ASC;
        `;
        const childrenResult = await client.query(childrenQuery, [id, tenant.organizationId]);

        // Device and Machine counts
        const statsQuery = `
          SELECT 
            (SELECT count(*) FROM devices WHERE location_id = $1 AND organization_id = $2) AS device_count,
            (SELECT count(*) FROM gateways WHERE location_id = $1 AND organization_id = $2) AS gateway_count,
            (SELECT count(*) FROM industrial_machines WHERE location_id = $1 AND organization_id = $2) AS machine_count;
        `;
        const statsResult = await client.query(statsQuery, [id, tenant.organizationId]);

        return {
          location: {
            ...locResult.rows[0],
            children: childrenResult.rows,
            stats: {
              devices: parseInt(statsResult.rows[0].device_count, 10),
              gateways: parseInt(statsResult.rows[0].gateway_count, 10),
              machines: parseInt(statsResult.rows[0].machine_count, 10),
            },
          },
        };
      });
    }
  );

  // Create location
  app.post(
    '/v1/locations',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Create a new site, building, floor, line, or room location node',
        tags: ['Locations'],
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const parseResult = createLocationSchema.safeParse(request.body);

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
        // If parent_id provided, verify parent exists in this org
        if (input.parentId) {
          const parentCheck = await client.query(
            'SELECT id FROM locations WHERE id = $1 AND organization_id = $2;',
            [input.parentId, tenant.organizationId]
          );
          if (parentCheck.rowCount === 0) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: `Parent location '${input.parentId}' not found in this organization.`,
            });
          }
        }

        const insertQuery = `
          INSERT INTO locations (organization_id, parent_id, name, code, type, address)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;

        const result = await client.query(insertQuery, [
          tenant.organizationId,
          input.parentId || null,
          input.name,
          input.code || null,
          input.type,
          JSON.stringify(input.address || {}),
        ]);

        return reply.status(201).send({ location: result.rows[0] });
      });
    }
  );

  // Update location
  app.put(
    '/v1/locations/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Update location name, code, type, address or parent hierarchy',
        tags: ['Locations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;
      const parseResult = updateLocationSchema.safeParse(request.body);

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
        // Prevent circular dependency (location cannot be parent of itself)
        if (input.parentId === id) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Location cannot be its own parent.',
          });
        }

        const updates: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [id, tenant.organizationId];
        let paramIndex = 3;

        if (input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(input.name);
        }
        if (input.code !== undefined) {
          updates.push(`code = $${paramIndex++}`);
          values.push(input.code);
        }
        if (input.type !== undefined) {
          updates.push(`type = $${paramIndex++}`);
          values.push(input.type);
        }
        if (input.parentId !== undefined) {
          updates.push(`parent_id = $${paramIndex++}`);
          values.push(input.parentId);
        }
        if (input.address !== undefined) {
          updates.push(`address = $${paramIndex++}`);
          values.push(JSON.stringify(input.address));
        }

        const query = `
          UPDATE locations
          SET ${updates.join(', ')}
          WHERE id = $1 AND organization_id = $2
          RETURNING *;
        `;

        const result = await client.query(query, values);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Location not found' });
        }

        return { location: result.rows[0] };
      });
    }
  );

  // Delete location
  app.delete(
    '/v1/locations/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Delete a location node (children cascade deleted, assigned hardware unlinked)',
        tags: ['Locations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          'DELETE FROM locations WHERE id = $1 AND organization_id = $2 RETURNING id;',
          [id, tenant.organizationId]
        );

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Location not found' });
        }

        return { success: true, message: `Location '${id}' deleted successfully.` };
      });
    }
  );
}

