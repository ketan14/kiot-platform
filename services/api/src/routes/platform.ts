import { FastifyInstance } from 'fastify';
import { pool, withTenantClient } from '../plugins/db.js';
import { requireTenantContext, requirePermission } from '../middleware/tenant.js';

export async function platformRoutes(app: FastifyInstance): Promise<void> {
  // ============================================================================
  // TENANT CUSTOMER ADMIN ROUTES (Subscriptions, Products & Audit Logs)
  // ============================================================================

  // 1. Get active organization subscriptions & product catalogue entitlements
  app.get(
    '/v1/organizations/:id/subscriptions',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List product catalogue and active subscription entitlements for the organization',
        tags: ['Customer Admin & Billing'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;
      if (id !== tenant.organizationId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const productsRes = await pool.query(
        `SELECT id, name, description, is_active, created_at FROM products ORDER BY id ASC;`
      );

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const subsRes = await client.query(
          `SELECT s.*, p.name AS product_name, p.description AS product_description
           FROM organization_subscriptions s
           JOIN products p ON s.product_id = p.id
           WHERE s.organization_id = $1
           ORDER BY s.created_at ASC;`,
          [tenant.organizationId]
        );

        const usageRes = await client.query(
          `SELECT
             (SELECT count(*) FROM devices WHERE organization_id = $1) AS total_devices,
             (SELECT count(*) FROM organization_memberships WHERE organization_id = $1 AND status = 'active') AS total_users,
             (SELECT count(*) FROM locations WHERE organization_id = $1) AS total_locations;`,
          [tenant.organizationId]
        );

        return {
          subscriptions: subsRes.rows,
          catalogue: productsRes.rows,
          usage: {
            devices: parseInt(usageRes.rows[0].total_devices, 10),
            users: parseInt(usageRes.rows[0].total_users, 10),
            locations: parseInt(usageRes.rows[0].total_locations, 10),
          },
        };
      });
    }
  );

  // 2. Activate or upgrade a product subscription for the tenant organization
  app.post(
    '/v1/organizations/:id/subscriptions',
    {
      preHandler: [requireTenantContext, requirePermission('billing:manage')],
      schema: {
        description: 'Activate or change plan tier for an organization product subscription',
        tags: ['Customer Admin & Billing'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;
      if (id !== tenant.organizationId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const body = request.body as {
        productId: string;
        planTier?: 'starter' | 'standard' | 'enterprise';
        status?: 'trial' | 'active' | 'suspended';
      };

      const tierLimits: Record<string, { devices: number; users: number }> = {
        starter: { devices: 10, users: 5 },
        standard: { devices: 25, users: 15 },
        enterprise: { devices: 100, users: 50 },
      };

      const tier = body.planTier || 'standard';
      const limits = tierLimits[tier] || tierLimits.standard!;
      const status = body.status || 'active';

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `INSERT INTO organization_subscriptions (
             organization_id, product_id, status, plan_tier, device_limit, user_limit
           ) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (organization_id, product_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             plan_tier = EXCLUDED.plan_tier,
             device_limit = EXCLUDED.device_limit,
             user_limit = EXCLUDED.user_limit,
             updated_at = NOW()
           RETURNING *;`,
          [tenant.organizationId, body.productId, status, tier, limits.devices, limits.users]
        );

        await pool.query(
          `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2::uuid, 'subscription.updated', 'subscription', $3, $4);`,
          [
            tenant.organizationId,
            tenant.userId,
            body.productId,
            JSON.stringify({ productId: body.productId, planTier: tier, status }),
          ]
        );

        return { subscription: result.rows[0] };
      });
    }
  );

  // 3. List organization audit logs (for Customer Admin Portal)
  app.get(
    '/v1/organizations/:id/audit-logs',
    {
      preHandler: [requireTenantContext, requirePermission('audit:read')],
      schema: {
        description: 'List security and operational audit logs for the active organization',
        tags: ['Customer Admin & Billing'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;
      if (id !== tenant.organizationId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const result = await pool.query(
        `SELECT a.id, a.organization_id, a.user_id, u.email AS user_email, u.full_name AS user_name,
                a.action, a.entity_type, a.entity_id, a.details, a.created_at
         FROM audit_logs a
         LEFT JOIN user_profiles u ON a.user_id = u.id
         WHERE a.organization_id = $1
         ORDER BY a.created_at DESC
         LIMIT 50;`,
        [tenant.organizationId]
      );

      return { auditLogs: result.rows };
    }
  );

  // ============================================================================
  // INTERNAL PLATFORM ADMIN PORTAL ROUTES (/v1/platform/*)
  // ============================================================================

  // 4. Global Platform Overview Metrics & Recent Activity
  app.get(
    '/v1/platform/overview',
    {
      schema: {
        description: 'Global platform KPIs across all tenant organizations, devices, and OTA releases',
        tags: ['Platform Admin'],
      },
    },
    async () => {
      const countsQuery = `
        SELECT
          (SELECT count(*) FROM organizations) AS organizations,
          (SELECT count(*) FROM organizations WHERE is_active = true) AS active_organizations,
          (SELECT count(*) FROM user_profiles) AS users,
          (SELECT count(*) FROM devices) AS devices,
          (SELECT count(*) FROM devices WHERE status = 'online') AS online_devices,
          (SELECT count(*) FROM gateways) AS gateways,
          (SELECT count(*) FROM incidents WHERE status != 'RESOLVED') AS open_incidents,
          (SELECT count(*) FROM firmware_releases) AS firmware_releases,
          (SELECT count(*) FROM organization_subscriptions WHERE status = 'active') AS subscriptions;
      `;
      const countsRes = await pool.query(countsQuery);
      const row = countsRes.rows[0];

      const auditRes = await pool.query(`
        SELECT a.id, a.organization_id, o.name AS organization_name,
               a.user_id, u.email AS user_email,
               a.action, a.entity_type, a.entity_id, a.details, a.created_at
        FROM audit_logs a
        LEFT JOIN organizations o ON a.organization_id = o.id
        LEFT JOIN user_profiles u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 25;
      `);

      return {
        totals: {
          organizations: parseInt(row.organizations, 10),
          activeOrganizations: parseInt(row.active_organizations, 10),
          users: parseInt(row.users, 10),
          devices: parseInt(row.devices, 10),
          onlineDevices: parseInt(row.online_devices, 10),
          gateways: parseInt(row.gateways, 10),
          openIncidents: parseInt(row.open_incidents, 10),
          firmwareReleases: parseInt(row.firmware_releases, 10),
          subscriptions: parseInt(row.subscriptions, 10),
        },
        recentAuditLogs: auditRes.rows,
      };
    }
  );

  // 5. Global Tenant Organizations Directory (with device, user, and subscription counts)
  app.get(
    '/v1/platform/organizations',
    {
      schema: {
        description: 'List all tenant organizations on the KIOT Platform with resource usage and subscriptions',
        tags: ['Platform Admin'],
      },
    },
    async () => {
      const query = `
        SELECT
          o.id,
          o.name,
          o.slug,
          o.is_active,
          o.created_at,
          o.updated_at,
          (SELECT count(*) FROM organization_memberships m WHERE m.organization_id = o.id) AS member_count,
          (SELECT count(*) FROM devices d WHERE d.organization_id = o.id) AS device_count,
          (SELECT count(*) FROM locations l WHERE l.organization_id = o.id) AS location_count,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'product_id', s.product_id,
              'plan_tier', s.plan_tier,
              'status', s.status,
              'device_limit', s.device_limit
            )) FROM organization_subscriptions s WHERE s.organization_id = o.id),
            '[]'::json
          ) AS subscriptions
        FROM organizations o
        ORDER BY o.created_at ASC;
      `;
      const result = await pool.query(query);
      return { organizations: result.rows };
    }
  );

  // 6. Provision a new Tenant Organization from Platform Admin
  app.post(
    '/v1/platform/organizations',
    {
      schema: {
        description: 'Provision a new tenant organization with initial product entitlement',
        tags: ['Platform Admin'],
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        slug?: string;
        planTier?: string;
        products?: string[];
        ownerEmail?: string;
      };

      if (!body.name || body.name.trim().length < 2) {
        return reply.status(400).send({ error: 'Organization name is required' });
      }

      const slug =
        body.slug?.trim().toLowerCase() ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const orgRes = await pool.query(
        `INSERT INTO organizations (name, slug, is_active)
         VALUES ($1, $2, true)
         RETURNING *;`,
        [body.name.trim(), slug]
      );
      const org = orgRes.rows[0];

      // Attach super admin & optional ownerEmail
      const adminUserId = '00000000-0000-4000-b000-000000000001';
      await pool.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (organization_id, user_id) DO NOTHING;`,
        [org.id, adminUserId]
      );

      const products = body.products && body.products.length > 0 ? body.products : ['industrial'];
      const tier = body.planTier || 'standard';
      const deviceLimit = tier === 'enterprise' ? 100 : tier === 'starter' ? 10 : 25;

      for (const prod of products) {
        await pool.query(
          `INSERT INTO organization_subscriptions (organization_id, product_id, status, plan_tier, device_limit, user_limit)
           VALUES ($1, $2, 'active', $3, $4, 15)
           ON CONFLICT (organization_id, product_id) DO NOTHING;`,
          [org.id, prod, tier, deviceLimit]
        );
      }

      await pool.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2::uuid, 'tenant.provisioned', 'organization', $3, $4);`,
        [org.id, adminUserId, String(org.id), JSON.stringify({ name: org.name, slug: org.slug, tier })]
      );

      return reply.status(201).send({ organization: org });
    }
  );

  // 7. Toggle tenant organization active/suspended status
  app.patch(
    '/v1/platform/organizations/:id/status',
    {
      schema: {
        description: 'Activate or suspend a tenant organization',
        tags: ['Platform Admin'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      const result = await pool.query(
        `UPDATE organizations SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *;`,
        [id, isActive]
      );
      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'Organization not found' });
      }
      return { organization: result.rows[0] };
    }
  );

  // 8. Global Device & Gateway Registry across all tenants
  app.get(
    '/v1/platform/devices',
    {
      schema: {
        description: 'List all IoT devices across all tenant organizations',
        tags: ['Platform Admin'],
      },
    },
    async () => {
      const result = await pool.query(`
        SELECT d.*, o.name AS organization_name, o.slug AS organization_slug, l.name AS location_name
        FROM devices d
        JOIN organizations o ON d.organization_id = o.id
        LEFT JOIN locations l ON d.location_id = l.id
        ORDER BY d.created_at DESC;
      `);
      return { devices: result.rows };
    }
  );

  // 9. List OTA Firmware Releases
  app.get(
    '/v1/platform/firmware',
    {
      schema: {
        description: 'List registered OTA firmware releases across hardware and product lines',
        tags: ['Platform Admin'],
      },
    },
    async () => {
      const result = await pool.query(`
        SELECT * FROM firmware_releases ORDER BY released_at DESC;
      `);
      return { releases: result.rows };
    }
  );

  // 10. Publish a new OTA Firmware Release
  app.post(
    '/v1/platform/firmware',
    {
      schema: {
        description: 'Register a new Over-The-Air (OTA) firmware release',
        tags: ['Platform Admin'],
      },
    },
    async (request, reply) => {
      const body = request.body as {
        version: string;
        hardwareType: string;
        productId: string;
        releaseNotes?: string;
        checksumSha256?: string;
        binarySizeBytes?: number;
        isStable?: boolean;
        isMandatory?: boolean;
        rolloutPercentage?: number;
      };

      if (!body.version || !body.productId) {
        return reply.status(400).send({ error: 'version and productId are required' });
      }

      const checksum =
        body.checksumSha256 ||
        Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const result = await pool.query(
        `INSERT INTO firmware_releases (
           version, hardware_type, product_id, release_notes, checksum_sha256,
           binary_size_bytes, is_stable, is_mandatory, rollout_percentage
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *;`,
        [
          body.version.trim(),
          body.hardwareType || 'esp32',
          body.productId,
          body.releaseNotes || null,
          checksum,
          body.binarySizeBytes || 1384420,
          body.isStable ?? true,
          body.isMandatory ?? false,
          body.rolloutPercentage ?? 100,
        ]
      );

      return reply.status(201).send({ release: result.rows[0] });
    }
  );

  // 11. Global Products Catalogue Management
  app.get(
    '/v1/platform/products',
    {
      schema: {
        description: 'List global KIOT products catalogue and adoption counts',
        tags: ['Platform Admin'],
      },
    },
    async () => {
      const result = await pool.query(`
        SELECT
          p.id,
          p.name,
          p.description,
          p.is_active,
          p.created_at,
          (SELECT count(*) FROM organization_subscriptions s WHERE s.product_id = p.id AND s.status = 'active') AS active_subscriptions,
          (SELECT count(*) FROM devices d WHERE d.product_id = p.id) AS total_devices
        FROM products p
        ORDER BY p.id ASC;
      `);
      return { products: result.rows };
    }
  );
}
