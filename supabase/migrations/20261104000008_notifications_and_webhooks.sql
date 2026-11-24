-- ==============================================================================
-- Migration: 20261104000008_notifications_and_webhooks.sql
-- Description: Multi-Channel Notification Delivery Channels (Email, Webhook, SMS/Push),
--              Notification Delivery Ledger, User Preferences, and Incident Escalation
-- ==============================================================================

-- 1. Notification Channel Type & Delivery Status Enums
DO $$ BEGIN
  CREATE TYPE notification_channel_type AS ENUM ('EMAIL', 'WEBHOOK', 'SLACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'ESCALATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Notification Channels Table (Per-Organization Delivery Endpoints)
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  channel_type notification_channel_type NOT NULL,
  target VARCHAR(500) NOT NULL, -- email address(es) or webhook URL
  secret_header VARCHAR(255),   -- optional HMAC secret for webhooks
  min_severity VARCHAR(20) NOT NULL DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_channels_org ON notification_channels(organization_id);

-- 3. Notification Deliveries Table (Audit & Retry Ledger)
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  channel_type notification_channel_type NOT NULL,
  channel_name VARCHAR(150) NOT NULL,
  recipient VARCHAR(500) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status notification_delivery_status NOT NULL DEFAULT 'SENT',
  response_code INT,
  error_message TEXT,
  attempt_count INT NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org ON notification_deliveries(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_incident ON notification_deliveries(incident_id);

-- 4. Track escalation state on incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INT NOT NULL DEFAULT 0;

-- 5. Enable Row-Level Security
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_channels_select ON notification_channels;
CREATE POLICY notification_channels_select ON notification_channels
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS notification_channels_manage ON notification_channels;
CREATE POLICY notification_channels_manage ON notification_channels
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'operator'));

DROP POLICY IF EXISTS notification_deliveries_select ON notification_deliveries;
CREATE POLICY notification_deliveries_select ON notification_deliveries
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS notification_deliveries_insert ON notification_deliveries;
CREATE POLICY notification_deliveries_insert ON notification_deliveries
  FOR INSERT WITH CHECK (app.is_org_member(organization_id));

-- 6. Seed Default Notification Channels for Apex Precision Manufacturing Ltd.
INSERT INTO notification_channels (
  id, organization_id, name, channel_type, target, secret_header, min_severity, is_enabled
) VALUES
  (
    '00000000-0000-4000-e100-000000000001',
    '00000000-0000-4000-a000-000000000001',
    'Plant Shift Operations Email Dispatch',
    'EMAIL',
    'admin@apex.kiot.io, operator@apex.kiot.io',
    NULL,
    'WARNING',
    true
  ),
  (
    '00000000-0000-4000-e100-000000000002',
    '00000000-0000-4000-a000-000000000001',
    'Factory ERP & Incident Webhook Gateway',
    'WEBHOOK',
    'http://localhost:3000/health',
    'whsec_kiot_apex_2026_hmac',
    'CRITICAL',
    true
  ),
  (
    '00000000-0000-4000-e100-000000000003',
    '00000000-0000-4000-a000-000000000001',
    'Maintenance Engineering Slack Ops Channel',
    'SLACK',
    'https://hooks.slack.com/services/T0000/B0000/KIOT-CNC-OPS',
    NULL,
    'WARNING',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Seed initial sample delivery logs
INSERT INTO notification_deliveries (
  id, organization_id, channel_id, channel_type, channel_name,
  recipient, subject, payload, status, response_code, attempt_count
) VALUES
  (
    '00000000-0000-4000-e200-000000000001',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-e100-000000000001',
    'EMAIL',
    'Plant Shift Operations Email Dispatch',
    'admin@apex.kiot.io, operator@apex.kiot.io',
    '[KIOT WARNING] High Spindle Temperature on DEV-ESP32-001',
    '{"deviceId": "DEV-ESP32-001", "metric": "temperature", "value": 78.4, "severity": "WARNING"}'::jsonb,
    'SENT',
    200,
    1
  ),
  (
    '00000000-0000-4000-e200-000000000002',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-e100-000000000002',
    'WEBHOOK',
    'Factory ERP & Incident Webhook Gateway',
    'http://localhost:3000/health',
    '[KIOT CRITICAL] Radial Vibration Anomaly on DEV-ESP32-001',
    '{"deviceId": "DEV-ESP32-001", "metric": "vibration_rms", "value": 8.9, "severity": "CRITICAL", "signature": "sha256=9f8a1e..."}'::jsonb,
    'SENT',
    200,
    1
  )
ON CONFLICT (id) DO NOTHING;
