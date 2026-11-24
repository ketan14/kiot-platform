import { FastifyInstance } from 'fastify';
import { pool } from '../plugins/db.js';
import { signJwtToken, resolveUserIdFromToken } from '../plugins/jwt.js';
import { loginSchema, registerSchema, switchOrganizationSchema } from '@kiot/validation';
import { ROLE_PERMISSIONS } from '@kiot/permissions';
import { OrganizationRole } from '@kiot/shared-types';
import { DEMO_USER_ID } from '../middleware/tenant.js';

interface UserOrgMembershipRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: OrganizationRole;
  status: string;
  plan_tier: string | null;
}

async function fetchUserOrganizations(userId: string): Promise<UserOrgMembershipRow[]> {
  const query = `
    SELECT
      o.id,
      o.name,
      o.slug,
      o.logo_url,
      m.role,
      m.status,
      COALESCE(
        (SELECT s.plan_tier FROM organization_subscriptions s
         WHERE s.organization_id = o.id AND s.product_id = 'industrial' LIMIT 1),
        'standard'
      ) AS plan_tier
    FROM organizations o
    JOIN organization_memberships m ON o.id = m.organization_id
    WHERE m.user_id = $1 AND m.status = 'active' AND o.is_active = true
    ORDER BY m.created_at ASC;
  `;
  const result = await pool.query<UserOrgMembershipRow>(query, [userId]);
  return result.rows;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // 1. Login with Email + Password
  app.post(
    '/v1/auth/login',
    {
      schema: {
        description: 'Authenticate user with email and password, returning JWT session and organizations',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.issues[0]?.message || 'Invalid credentials format.',
        });
      }

      const { email, password } = parseResult.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Verify user email and password hash via pgcrypto crypt()
      const userQuery = `
        SELECT
          id,
          email,
          full_name,
          avatar_url,
          is_active,
          (password_hash IS NOT NULL AND password_hash = crypt($2, password_hash)) AS password_valid
        FROM user_profiles
        WHERE LOWER(email) = $1
        LIMIT 1;
      `;
      const userResult = await pool.query(userQuery, [normalizedEmail, password]);

      if (userResult.rowCount === 0 || !userResult.rows[0].password_valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        });
      }

      const user = userResult.rows[0];
      if (!user.is_active) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          code: 'ACCOUNT_DISABLED',
          message: 'This user account has been suspended.',
        });
      }

      // Fetch user's active organizations
      const orgs = await fetchUserOrganizations(user.id);
      if (orgs.length === 0) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          code: 'NO_ACTIVE_ORGANIZATION',
          message: 'Your account does not belong to any active organization.',
        });
      }

      const primaryOrg = orgs[0]!;
      const permissions = ROLE_PERMISSIONS[primaryOrg.role] || [];

      // Update last_login_at and record audit log
      await pool.query(`UPDATE user_profiles SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1;`, [
        user.id,
      ]);
      await pool.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2::uuid, 'auth.login', 'user', $3, $4);`,
        [primaryOrg.id, user.id, String(user.id), JSON.stringify({ email: user.email, role: primaryOrg.role })]
      );

      const jwt = signJwtToken({
        sub: user.id,
        email: user.email,
        fullName: user.full_name,
        orgId: primaryOrg.id,
        role: primaryOrg.role,
      });

      return {
        accessToken: jwt.accessToken,
        expiresAt: jwt.expiresAt,
        expiresIn: jwt.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
        },
        activeOrganization: {
          id: primaryOrg.id,
          name: primaryOrg.name,
          slug: primaryOrg.slug,
          tier: primaryOrg.plan_tier || 'standard',
          role: primaryOrg.role,
          permissions,
        },
        organizations: orgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          tier: o.plan_tier || 'standard',
          role: o.role,
          permissions: ROLE_PERMISSIONS[o.role] || [],
        })),
      };
    }
  );

  // 2. Register / Sign Up New Account
  app.post(
    '/v1/auth/register',
    {
      schema: {
        description: 'Register a new user account and attach to organization or create new workspace',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            organizationName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parseResult = registerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.issues[0]?.message || 'Validation failed.',
        });
      }

      const { fullName, email, password, organizationName } = parseResult.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists with a password
      const existingCheck = await pool.query(
        `SELECT id, password_hash FROM user_profiles WHERE LOWER(email) = $1 LIMIT 1;`,
        [normalizedEmail]
      );

      let userId: string;

      if (existingCheck.rowCount && existingCheck.rowCount > 0) {
        const existing = existingCheck.rows[0];
        if (existing.password_hash) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email address is already registered.',
          });
        }
        // Invited user setting password for the first time
        const updated = await pool.query(
          `UPDATE user_profiles
           SET full_name = $2,
               password_hash = crypt($3, gen_salt('bf', 10)),
               is_active = true,
               last_login_at = NOW(),
               updated_at = NOW()
           WHERE id = $1
           RETURNING id;`,
          [existing.id, fullName, password]
        );
        userId = updated.rows[0].id;
      } else {
        const inserted = await pool.query(
          `INSERT INTO user_profiles (email, full_name, password_hash, is_active, last_login_at)
           VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), true, NOW())
           RETURNING id;`,
          [normalizedEmail, fullName, password]
        );
        userId = inserted.rows[0].id;
      }

      // If organizationName provided, create new organization and assign 'owner'
      if (organizationName && organizationName.trim().length >= 2) {
        const slugBase = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const uniqueSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newOrg = await pool.query(
          `INSERT INTO organizations (name, slug, is_active)
           VALUES ($1, $2, true)
           RETURNING id;`,
          [organizationName.trim(), uniqueSlug]
        );
        const newOrgId = newOrg.rows[0].id;

        await pool.query(
          `INSERT INTO organization_memberships (organization_id, user_id, role, status)
           VALUES ($1, $2, 'owner', 'active')
           ON CONFLICT (organization_id, user_id) DO NOTHING;`,
          [newOrgId, userId]
        );

        await pool.query(
          `INSERT INTO organization_subscriptions (organization_id, product_id, status, plan_tier, device_limit, user_limit)
           VALUES ($1, 'industrial', 'active', 'standard', 25, 10)
           ON CONFLICT (organization_id, product_id) DO NOTHING;`,
          [newOrgId]
        );
      }

      // Ensure user belongs to at least one organization (attach to demo Apex Precision as operator if none)
      let orgs = await fetchUserOrganizations(userId);
      if (orgs.length === 0) {
        const defaultOrgId = '00000000-0000-4000-a000-000000000001';
        await pool.query(
          `INSERT INTO organization_memberships (organization_id, user_id, role, status)
           VALUES ($1, $2, 'operator', 'active')
           ON CONFLICT (organization_id, user_id) DO NOTHING;`,
          [defaultOrgId, userId]
        );
        orgs = await fetchUserOrganizations(userId);
      }

      const primaryOrg = orgs[0]!;
      const permissions = ROLE_PERMISSIONS[primaryOrg.role] || [];

      const jwt = signJwtToken({
        sub: userId,
        email: normalizedEmail,
        fullName,
        orgId: primaryOrg.id,
        role: primaryOrg.role,
      });

      return reply.status(201).send({
        accessToken: jwt.accessToken,
        expiresAt: jwt.expiresAt,
        expiresIn: jwt.expiresIn,
        user: {
          id: userId,
          email: normalizedEmail,
          fullName,
          avatarUrl: null,
        },
        activeOrganization: {
          id: primaryOrg.id,
          name: primaryOrg.name,
          slug: primaryOrg.slug,
          tier: primaryOrg.plan_tier || 'standard',
          role: primaryOrg.role,
          permissions,
        },
        organizations: orgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          tier: o.plan_tier || 'standard',
          role: o.role,
          permissions: ROLE_PERMISSIONS[o.role] || [],
        })),
      });
    }
  );

  // 3. Get Current Session Profile (/v1/auth/me)
  app.get(
    '/v1/auth/me',
    {
      schema: {
        description: 'Get authenticated user profile, active organization role, and RBAC permissions',
        tags: ['Authentication'],
      },
    },
    async (request, reply) => {
      const { userId, isExplicitToken } = resolveUserIdFromToken(
        request.headers.authorization,
        DEMO_USER_ID
      );

      if (!userId) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: isExplicitToken ? 'Invalid or expired session token.' : 'Not authenticated.',
        });
      }

      const userRes = await pool.query(
        `SELECT id, email, full_name, avatar_url, last_login_at, created_at
         FROM user_profiles
         WHERE id = $1 AND is_active = true
         LIMIT 1;`,
        [userId]
      );

      if (userRes.rowCount === 0) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'User profile not found or inactive.',
        });
      }

      const user = userRes.rows[0];
      const orgs = await fetchUserOrganizations(user.id);

      const requestedOrgId = request.headers['x-kiot-organization-id'] as string | undefined;
      const activeOrg =
        orgs.find((o) => o.id === requestedOrgId) || orgs[0] || null;

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          lastLoginAt: user.last_login_at,
        },
        activeOrganization: activeOrg
          ? {
              id: activeOrg.id,
              name: activeOrg.name,
              slug: activeOrg.slug,
              tier: activeOrg.plan_tier || 'standard',
              role: activeOrg.role,
              permissions: ROLE_PERMISSIONS[activeOrg.role] || [],
            }
          : null,
        organizations: orgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          tier: o.plan_tier || 'standard',
          role: o.role,
          permissions: ROLE_PERMISSIONS[o.role] || [],
        })),
      };
    }
  );

  // 4. Switch Active Organization Context (/v1/auth/switch-organization)
  app.post(
    '/v1/auth/switch-organization',
    {
      schema: {
        description: 'Switch active organization context and issue an updated JWT token',
        tags: ['Authentication'],
      },
    },
    async (request, reply) => {
      const { userId } = resolveUserIdFromToken(request.headers.authorization, DEMO_USER_ID);
      if (!userId) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Valid authentication required.',
        });
      }

      const parseResult = switchOrganizationSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Valid organizationId is required.',
        });
      }

      const { organizationId } = parseResult.data;

      const userRes = await pool.query(
        `SELECT id, email, full_name, avatar_url FROM user_profiles WHERE id = $1 AND is_active = true;`,
        [userId]
      );
      if (userRes.rowCount === 0) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized' });
      }
      const user = userRes.rows[0];

      const orgs = await fetchUserOrganizations(userId);
      const targetOrg = orgs.find((o) => o.id === organizationId);

      if (!targetOrg) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not an active member of the requested organization.',
        });
      }

      const jwt = signJwtToken({
        sub: user.id,
        email: user.email,
        fullName: user.full_name,
        orgId: targetOrg.id,
        role: targetOrg.role,
      });

      return {
        accessToken: jwt.accessToken,
        expiresAt: jwt.expiresAt,
        expiresIn: jwt.expiresIn,
        activeOrganization: {
          id: targetOrg.id,
          name: targetOrg.name,
          slug: targetOrg.slug,
          tier: targetOrg.plan_tier || 'standard',
          role: targetOrg.role,
          permissions: ROLE_PERMISSIONS[targetOrg.role] || [],
        },
      };
    }
  );
}
