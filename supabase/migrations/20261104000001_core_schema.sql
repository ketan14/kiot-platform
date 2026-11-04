-- ==============================================================================
-- KIOT Platform: Core Relational & Time-Series Schema
-- Migration: 20261104000001_core_schema.sql
-- ==============================================================================

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- 2. Custom Enumerations
DO $$ BEGIN
  CREATE TYPE platform_role AS ENUM ('super_admin', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'manager', 'operator', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('home', 'cold', 'industrial', 'energy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'expired', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE device_status AS ENUM ('online', 'offline', 'degraded', 'provisioning');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE command_status AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE machine_status AS ENUM ('running', 'stopped', 'abnormal', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Core Relational Tables

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'viewer',
  status membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);

-- Products Catalogue
CREATE TABLE IF NOT EXISTS products (
  id product_type PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Subscriptions & Entitlements
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id product_type NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'trial',
  plan_tier VARCHAR(50) NOT NULL DEFAULT 'standard',
  device_limit INT NOT NULL DEFAULT 10,
  user_limit INT NOT NULL DEFAULT 5,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_product UNIQUE (organization_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);

-- Locations (Hierarchical: Site -> Building -> Line/Room)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  type VARCHAR(50) NOT NULL DEFAULT 'site',
  address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);

-- Industrial Gateways
CREATE TABLE IF NOT EXISTS gateways (
  id VARCHAR(100) PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL DEFAULT 'Linux Industrial Gateway',
  ip_address INET,
  mac_address VARCHAR(50),
  status device_status NOT NULL DEFAULT 'offline',
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gateways_org ON gateways(organization_id);

-- Devices (ESP32 & Sensors)
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(100) PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id product_type NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  gateway_id VARCHAR(100) REFERENCES gateways(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  hardware_type VARCHAR(50) NOT NULL DEFAULT 'esp32',
  hardware_serial VARCHAR(100) NOT NULL UNIQUE,
  mac_address VARCHAR(50),
  firmware_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status device_status NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_org_product ON devices(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_devices_gateway ON devices(gateway_id);

-- Device Shadows (Desired vs. Reported State)
CREATE TABLE IF NOT EXISTS device_shadows (
  device_id VARCHAR(100) PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  desired JSONB NOT NULL DEFAULT '{}'::jsonb,
  reported JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_device_shadows_org ON device_shadows(organization_id);

-- Device Commands Lifecycle
CREATE TABLE IF NOT EXISTS device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status command_status NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  issued_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_device_commands_org_status ON device_commands(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_device_commands_device ON device_commands(device_id);

-- Industrial Machines (Domain specific for KIOT Industrial)
CREATE TABLE IF NOT EXISTS industrial_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  primary_device_id VARCHAR(100) REFERENCES devices(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  machine_code VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status machine_status NOT NULL DEFAULT 'stopped',
  current_operating_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_machine_code UNIQUE (organization_id, machine_code)
);
CREATE INDEX IF NOT EXISTS idx_industrial_machines_org ON industrial_machines(organization_id);
CREATE INDEX IF NOT EXISTS idx_industrial_machines_status ON industrial_machines(organization_id, status);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);

-- 4. Timeseries Telemetry (TimescaleDB Hypertable)
CREATE TABLE IF NOT EXISTS telemetry_readings (
  time TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id product_type NOT NULL,
  device_id TEXT NOT NULL,
  gateway_id TEXT,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'good',
  sequence_number BIGINT,
  PRIMARY KEY (time, organization_id, device_id, metric)
);

-- Convert to TimescaleDB Hypertable (chunked by time, default 7 days)
SELECT create_hypertable(
  'telemetry_readings',
  'time',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '7 days'
);

-- Efficient Compound Index for Time-Series Queries
CREATE INDEX IF NOT EXISTS idx_telemetry_org_device_metric_time 
  ON telemetry_readings (organization_id, device_id, metric, time DESC);
