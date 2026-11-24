-- ==============================================================================
-- Migration: 20261104000006_auth_and_users.sql
-- Description: Add password_hash and authentication columns to user_profiles,
--              and seed default demo accounts for all RBAC roles & multi-org demo
-- ==============================================================================

-- 1. Extend user_profiles with authentication metadata
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Set default bcrypt password hash ('kiot12345') for existing profiles without a password
UPDATE user_profiles
SET password_hash = crypt('kiot12345', gen_salt('bf', 10))
WHERE password_hash IS NULL;

-- 3. Seed secondary demo organization for multi-tenant organization switcher testing
INSERT INTO organizations (id, name, slug, logo_url, is_active) VALUES
  ('00000000-0000-4000-a000-000000000002', 'Bharat ColdChain & Logistics Pvt. Ltd.', 'bharat-coldchain', NULL, true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed complete set of RBAC demo users (Password for all demo users: kiot12345)
INSERT INTO user_profiles (id, email, full_name, avatar_url, password_hash, is_active) VALUES
  ('00000000-0000-4000-b000-000000000001', 'admin@apex.kiot.io', 'Rajesh Sharma', NULL, crypt('kiot12345', gen_salt('bf', 10)), true),
  ('00000000-0000-4000-b000-000000000002', 'operator@apex.kiot.io', 'Amit Patel', NULL, crypt('kiot12345', gen_salt('bf', 10)), true),
  ('00000000-0000-4000-b000-000000000003', 'manager@apex.kiot.io', 'Priya Nair', NULL, crypt('kiot12345', gen_salt('bf', 10)), true),
  ('00000000-0000-4000-b000-000000000004', 'viewer@apex.kiot.io', 'VikramDesai', NULL, crypt('kiot12345', gen_salt('bf', 10)), true)
ON CONFLICT (email) DO UPDATE
  SET password_hash = COALESCE(user_profiles.password_hash, EXCLUDED.password_hash),
      is_active = true;

UPDATE user_profiles SET full_name = 'Vikram Desai' WHERE email = 'viewer@apex.kiot.io';

-- 5. Seed RBAC memberships across organizations
INSERT INTO organization_memberships (id, organization_id, user_id, role, status) VALUES
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', 'owner', 'active'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000002', 'operator', 'active'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000003', 'manager', 'active'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000004', 'viewer', 'active'),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000001', 'admin', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 6. Seed subscription for secondary organization
INSERT INTO organization_subscriptions (id, organization_id, product_id, status, plan_tier, device_limit, user_limit) VALUES
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000002', 'industrial', 'active', 'standard', 25, 10)
ON CONFLICT (organization_id, product_id) DO NOTHING;
