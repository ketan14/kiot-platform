-- ==============================================================================
-- Migration: 20261104000005_device_onboarding_and_locations.sql
-- Description: Add RLS policies for device shadow insert/delete, and helper indexes
-- ==============================================================================

-- 1. Ensure device_shadows has INSERT and DELETE policies for multi-tenant users
DROP POLICY IF EXISTS shadows_insert ON device_shadows;
CREATE POLICY shadows_insert ON device_shadows
  FOR INSERT WITH CHECK (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS shadows_delete ON device_shadows;
CREATE POLICY shadows_delete ON device_shadows
  FOR DELETE USING (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
  );

-- 2. Ensure initial shadow records exist for existing devices missing a shadow
INSERT INTO device_shadows (device_id, organization_id, desired, reported, delta, version)
SELECT d.id, d.organization_id, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 1
FROM devices d
LEFT JOIN device_shadows s ON d.id = s.device_id
WHERE s.device_id IS NULL
ON CONFLICT (device_id) DO NOTHING;

-- 3. Allow inserting user_profiles for team invitations
DROP POLICY IF EXISTS user_profiles_insert ON user_profiles;
CREATE POLICY user_profiles_insert ON user_profiles
  FOR INSERT WITH CHECK (true);

-- 4. Additional performance index for locations hierarchy lookup
CREATE INDEX IF NOT EXISTS idx_locations_org_parent ON locations(organization_id, parent_id);

