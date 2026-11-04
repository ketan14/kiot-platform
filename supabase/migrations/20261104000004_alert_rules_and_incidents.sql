-- ==============================================================================
-- KIOT Platform: Alert Rules & Incident Management Schema
-- Migration: 20261104000004_alert_rules_and_incidents.sql
-- ==============================================================================

-- 1. Custom Types for Alerting
DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_condition AS ENUM ('GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id product_type NOT NULL DEFAULT 'industrial',
  device_id VARCHAR(100) REFERENCES devices(id) ON DELETE CASCADE, -- NULL means all devices in org for that metric
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric VARCHAR(100) NOT NULL,
  condition alert_condition NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'WARNING',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON alert_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric ON alert_rules(metric, is_enabled);

-- 3. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  device_id VARCHAR(100) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,
  trigger_value DOUBLE PRECISION NOT NULL,
  threshold_value DOUBLE PRECISION NOT NULL,
  severity alert_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'OPEN',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_device ON incidents(device_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents FORCE ROW LEVEL SECURITY;

-- 5. Multi-Tenant RLS Policies
CREATE POLICY alert_rules_select ON alert_rules
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY alert_rules_insert ON alert_rules
  FOR INSERT WITH CHECK (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY alert_rules_update ON alert_rules
  FOR UPDATE USING (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY alert_rules_delete ON alert_rules
  FOR DELETE USING (
    app.is_org_member(organization_id) AND 
    app.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY incidents_select ON incidents
  FOR SELECT USING (app.is_org_member(organization_id));

CREATE POLICY incidents_insert ON incidents
  FOR INSERT WITH CHECK (app.is_org_member(organization_id));

CREATE POLICY incidents_update ON incidents
  FOR UPDATE USING (app.is_org_member(organization_id));

-- 6. Default Demo Seed Alert Rules
INSERT INTO alert_rules (
  id, organization_id, product_id, device_id, name, description, metric, condition, threshold, severity, is_enabled
) VALUES 
  (
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-a000-000000000001',
    'industrial',
    'DEV-ESP32-001',
    'High Radial Spindle Vibration',
    'Exceeds ISO 10816 Zone C limits indicating severe imbalance or mechanical bearing wear',
    'vibration_rms',
    'GT',
    4.5,
    'CRITICAL',
    true
  ),
  (
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-a000-000000000001',
    'industrial',
    'DEV-ESP32-001',
    'Spindle Bearing Thermal Trip',
    'Bearing temperature exceeds manufacturer maximum rated continuous limit (72°C)',
    'temperature_bearing',
    'GT',
    72.0,
    'CRITICAL',
    true
  ),
  (
    '00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-a000-000000000001',
    'industrial',
    'DEV-METER-001',
    'Peak Electrical Power Excursion',
    'Active machine power draw exceeds nominal machine demand threshold (20.0 kW)',
    'power_kw',
    'GT',
    20.0,
    'WARNING',
    true
  )
ON CONFLICT (id) DO NOTHING;
