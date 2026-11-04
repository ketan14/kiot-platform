-- ==============================================================================
-- KIOT Platform: Multi-Tenant Row-Level Security (RLS) Policies
-- Migration: 20261104000002_rls_policies.sql
-- ==============================================================================

-- 1. Helper Schema & Session Functions
CREATE SCHEMA IF NOT EXISTS app;

-- Extract current authenticated user ID from session context or Supabase auth
CREATE OR REPLACE FUNCTION app.current_user_id() 
RETURNS UUID AS $$
BEGIN
  -- 1. Check local session variable set by KIOT REST API
  IF NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL THEN
    RETURN current_setting('app.current_user_id', true)::UUID;
  END IF;

  -- 2. Fallback to Supabase Auth UID if running in Supabase environment
  BEGIN
    RETURN auth.uid();
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Extract active organization ID from request session context
CREATE OR REPLACE FUNCTION app.current_org_id() 
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is an active member of the specified organization
CREATE OR REPLACE FUNCTION app.is_org_member(target_org_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  IF app.current_user_id() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_memberships
    WHERE organization_id = target_org_id
      AND user_id = app.current_user_id()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retrieve the current user's role within an organization
CREATE OR REPLACE FUNCTION app.get_org_role(target_org_id UUID) 
RETURNS organization_role AS $$
DECLARE
  v_role organization_role;
BEGIN
  IF app.current_user_id() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.organization_memberships
  WHERE organization_id = target_org_id
    AND user_id = app.current_user_id()
    AND status = 'active';

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Enable Row-Level Security on All Tenant Tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_shadows ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE industrial_machines ENABLE ROW LEVEL SECURITY;
-- Note: telemetry_readings does NOT enable RLS directly because TimescaleDB
-- continuous aggregates (telemetry_1m_rollup, telemetry_1h_rollup) require
-- the underlying hypertable to have RLS disabled. Multi-tenant isolation for
-- telemetry is enforced at the API / Worker query level via mandatory organization_id filters.
-- ALTER TABLE telemetry_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies

-- User Profiles: Users can view all profiles in their organizations; edit only their own
CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (
    id = app.current_user_id() OR
    EXISTS (
      SELECT 1 FROM organization_memberships m1
      JOIN organization_memberships m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = app.current_user_id() AND m2.user_id = user_profiles.id
    )
  );

CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (id = app.current_user_id());

-- Organizations: Visible if user is an active member
CREATE POLICY org_select ON organizations
  FOR SELECT USING (app.is_org_member(id));

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (app.get_org_role(id) IN ('owner', 'admin'));

-- Organization Memberships
CREATE POLICY membership_select ON organization_memberships
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY membership_manage ON organization_memberships
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin'));

-- Locations
CREATE POLICY locations_select ON locations
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY locations_modify ON locations
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager'));

-- Gateways
CREATE POLICY gateways_select ON gateways
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY gateways_modify ON gateways
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager'));

-- Devices
CREATE POLICY devices_select ON devices
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY devices_modify ON devices
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager'));

-- Device Shadows
CREATE POLICY shadows_select ON device_shadows
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY shadows_update ON device_shadows
  FOR UPDATE USING (app.is_org_member(organization_id));

-- Device Commands
CREATE POLICY commands_select ON device_commands
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY commands_insert ON device_commands
  FOR INSERT WITH CHECK (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'operator')
  );

-- Industrial Machines
CREATE POLICY machines_select ON industrial_machines
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY machines_modify ON industrial_machines
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager'));

-- Audit Logs
CREATE POLICY audit_select ON audit_logs
  FOR SELECT USING (app.get_org_role(organization_id) IN ('owner', 'admin'));
