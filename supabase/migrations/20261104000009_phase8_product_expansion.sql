-- ==============================================================================
-- Migration: 20261104000009_phase8_product_expansion.sql
-- Description: Phase 8 Product Expansion for KIOT Cold, KIOT Energy, and KIOT Home
--              Domain tables, RLS policies, devices, shadows, and telemetry seed
-- ==============================================================================

-- 1. KIOT Cold: Cold Storage Chambers & HACCP Compliance Table
CREATE TABLE IF NOT EXISTS cold_chambers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  device_id VARCHAR(100) REFERENCES devices(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  chamber_code VARCHAR(50) NOT NULL,
  storage_category VARCHAR(100) NOT NULL DEFAULT 'Frozen Goods',
  target_temp_c NUMERIC(5, 2) NOT NULL DEFAULT -20.00,
  min_temp_c NUMERIC(5, 2) NOT NULL DEFAULT -24.00,
  max_temp_c NUMERIC(5, 2) NOT NULL DEFAULT -16.00,
  target_humidity_pct NUMERIC(5, 2) NOT NULL DEFAULT 60.00,
  haccp_status VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
  last_defrost_at TIMESTAMPTZ NOT NULL DEFAULT now() - INTERVAL '4 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_chamber_code UNIQUE (organization_id, chamber_code)
);
CREATE INDEX IF NOT EXISTS idx_cold_chambers_org ON cold_chambers(organization_id);

-- 2. KIOT Energy: Tariff Policies & Demand Thresholds Table
CREATE TABLE IF NOT EXISTS energy_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  base_rate_per_kwh NUMERIC(8, 2) NOT NULL DEFAULT 8.50,
  peak_rate_per_kwh NUMERIC(8, 2) NOT NULL DEFAULT 11.20,
  off_peak_rate_per_kwh NUMERIC(8, 2) NOT NULL DEFAULT 6.40,
  contracted_demand_kva NUMERIC(10, 2) NOT NULL DEFAULT 120.00,
  peak_demand_threshold_kw NUMERIC(10, 2) NOT NULL DEFAULT 85.00,
  carbon_factor_kg_per_kwh NUMERIC(6, 4) NOT NULL DEFAULT 0.7100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. KIOT Home: Smart Automation Scenes Table
CREATE TABLE IF NOT EXISTS home_automation_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  icon VARCHAR(50) NOT NULL DEFAULT 'Sun',
  target_device_id VARCHAR(100) REFERENCES devices(id) ON DELETE CASCADE,
  desired_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_home_scenes_org ON home_automation_scenes(organization_id);

-- 4. Enable Row-Level Security
ALTER TABLE cold_chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_automation_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cold_chambers_select ON cold_chambers;
CREATE POLICY cold_chambers_select ON cold_chambers
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS cold_chambers_manage ON cold_chambers;
CREATE POLICY cold_chambers_manage ON cold_chambers
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'operator'));

DROP POLICY IF EXISTS energy_tariffs_select ON energy_tariffs;
CREATE POLICY energy_tariffs_select ON energy_tariffs
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS energy_tariffs_manage ON energy_tariffs;
CREATE POLICY energy_tariffs_manage ON energy_tariffs
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS home_scenes_select ON home_automation_scenes;
CREATE POLICY home_scenes_select ON home_automation_scenes
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS home_scenes_manage ON home_automation_scenes;
CREATE POLICY home_scenes_manage ON home_automation_scenes
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'operator'));

-- 5. Activate Cold & Home Product Subscriptions for Demo Organizations
INSERT INTO organization_subscriptions (organization_id, product_id, status, plan_tier, device_limit, user_limit) VALUES
  ('00000000-0000-4000-a000-000000000001', 'cold', 'active', 'enterprise', 50, 15),
  ('00000000-0000-4000-a000-000000000001', 'home', 'active', 'standard', 25, 15),
  ('00000000-0000-4000-a000-000000000002', 'cold', 'active', 'enterprise', 50, 15)
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- 6. Seed Phase 8 Devices (Cold Storage Sensors & Smart Home Relay Hub)
INSERT INTO devices (
  id, organization_id, product_id, gateway_id, location_id,
  name, hardware_type, hardware_serial, firmware_version, status, last_seen_at
) VALUES
  (
    'DEV-COLD-001',
    '00000000-0000-4000-a000-000000000001',
    'cold',
    'GW-PUN-001',
    '00000000-0000-4000-e000-000000000001',
    'Blast Freezer Chamber A Node',
    'esp32',
    'SN-CLD-710291',
    '1.2.0',
    'online',
    now()
  ),
  (
    'DEV-COLD-002',
    '00000000-0000-4000-a000-000000000001',
    'cold',
    'GW-PUN-001',
    '00000000-0000-4000-e000-000000000001',
    'Pharma Vaccine Cold Room B Node',
    'esp32',
    'SN-CLD-710292',
    '1.2.0',
    'online',
    now()
  ),
  (
    'DEV-HOME-001',
    '00000000-0000-4000-a000-000000000001',
    'home',
    'GW-PUN-001',
    '00000000-0000-4000-e000-000000000001',
    'Executive Facility Smart Relay Hub (8-Ch)',
    'esp32',
    'SN-HOM-550192',
    '1.2.0',
    'online',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Device Shadows for Cold & Home Devices
INSERT INTO device_shadows (device_id, organization_id, desired, reported, delta, version) VALUES
  (
    'DEV-COLD-001',
    '00000000-0000-4000-a000-000000000001',
    '{"target_temp_c": -20.0, "compressor": "ON", "door_status": "CLOSED", "defrost_heater": "OFF"}'::jsonb,
    '{"target_temp_c": -20.0, "compressor": "ON", "door_status": "CLOSED", "defrost_heater": "OFF"}'::jsonb,
    '{}'::jsonb,
    1
  ),
  (
    'DEV-COLD-002',
    '00000000-0000-4000-a000-000000000001',
    '{"target_temp_c": 4.0, "compressor": "ON", "door_status": "CLOSED", "defrost_heater": "OFF"}'::jsonb,
    '{"target_temp_c": 4.0, "compressor": "ON", "door_status": "CLOSED", "defrost_heater": "OFF"}'::jsonb,
    '{}'::jsonb,
    1
  ),
  (
    'DEV-HOME-001',
    '00000000-0000-4000-a000-000000000001',
    '{"relay_main_lights": "ON", "relay_hvac_ac": "ON", "relay_exhaust_fan": "OFF", "relay_smart_lock": "LOCKED", "relay_lobby_signage": "ON", "relay_server_cooling": "ON", "ac_setpoint_c": 22}'::jsonb,
    '{"relay_main_lights": "ON", "relay_hvac_ac": "ON", "relay_exhaust_fan": "OFF", "relay_smart_lock": "LOCKED", "relay_lobby_signage": "ON", "relay_server_cooling": "ON", "ac_setpoint_c": 22}'::jsonb,
    '{}'::jsonb,
    1
  )
ON CONFLICT (device_id) DO NOTHING;

-- 8. Seed Cold Chambers
INSERT INTO cold_chambers (
  id, organization_id, location_id, device_id, name, chamber_code,
  storage_category, target_temp_c, min_temp_c, max_temp_c, target_humidity_pct, haccp_status
) VALUES
  (
    '00000000-0000-4000-c100-000000000001',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-e000-000000000001',
    'DEV-COLD-001',
    'Deep Blast Freezer Chamber A',
    'CHM-FRZ-A1',
    'Frozen Food & Dairy Export (-20°C)',
    -20.00,
    -23.00,
    -17.00,
    62.00,
    'COMPLIANT'
  ),
  (
    '00000000-0000-4000-c100-000000000002',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-e000-000000000001',
    'DEV-COLD-002',
    'GDP Biopharma Cold Room B',
    'CHM-PHM-B2',
    'Vaccines & Biologics (+2°C to +8°C)',
    4.00,
    2.00,
    8.00,
    55.00,
    'COMPLIANT'
  )
ON CONFLICT (organization_id, chamber_code) DO NOTHING;

-- 9. Seed Default Energy Tariff Policy
INSERT INTO energy_tariffs (
  organization_id, currency, base_rate_per_kwh, peak_rate_per_kwh,
  off_peak_rate_per_kwh, contracted_demand_kva, peak_demand_threshold_kw, carbon_factor_kg_per_kwh
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  'INR',
  8.50,
  11.20,
  6.40,
  120.00,
  85.00,
  0.7100
) ON CONFLICT (organization_id) DO NOTHING;

-- 10. Seed Smart Home Automation Scenes
INSERT INTO home_automation_scenes (
  id, organization_id, name, description, icon, target_device_id, desired_state
) VALUES
  (
    '00000000-0000-4000-b100-000000000001',
    '00000000-0000-4000-a000-000000000001',
    'Morning Facility Open',
    'Turn on main lighting, lobby signage, HVAC at 22°C, and ventilation exhaust.',
    'Sun',
    'DEV-HOME-001',
    '{"relay_main_lights": "ON", "relay_hvac_ac": "ON", "relay_exhaust_fan": "ON", "relay_smart_lock": "UNLOCKED", "relay_lobby_signage": "ON", "relay_server_cooling": "ON", "ac_setpoint_c": 22}'::jsonb
  ),
  (
    '00000000-0000-4000-b100-000000000002',
    '00000000-0000-4000-a000-000000000001',
    'Eco Energy Saver Mode',
    'Dim non-essential lobby signage, raise HVAC setpoint to 25°C, and turn off exhaust fan.',
    'Leaf',
    'DEV-HOME-001',
    '{"relay_main_lights": "ON", "relay_hvac_ac": "ON", "relay_exhaust_fan": "OFF", "relay_smart_lock": "LOCKED", "relay_lobby_signage": "OFF", "relay_server_cooling": "ON", "ac_setpoint_c": 25}'::jsonb
  ),
  (
    '00000000-0000-4000-b100-000000000003',
    '00000000-0000-4000-a000-000000000001',
    'Night Security Lockdown',
    'Lock perimeter smart doors, turn off office lighting & HVAC, keep 24/7 server cooling active.',
    'Moon',
    'DEV-HOME-001',
    '{"relay_main_lights": "OFF", "relay_hvac_ac": "OFF", "relay_exhaust_fan": "OFF", "relay_smart_lock": "LOCKED", "relay_lobby_signage": "OFF", "relay_server_cooling": "ON", "ac_setpoint_c": 26}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Initial Telemetry Readings for Cold, Energy, and Home
INSERT INTO telemetry_readings (time, organization_id, product_id, device_id, gateway_id, metric, value, unit, quality) VALUES
  (now() - INTERVAL '10 minutes', '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-001', 'GW-PUN-001', 'chamber_temp_c', -19.8, '°C', 'good'),
  (now() - INTERVAL '5 minutes',  '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-001', 'GW-PUN-001', 'chamber_temp_c', -20.1, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-001', 'GW-PUN-001', 'chamber_temp_c', -19.9, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-001', 'GW-PUN-001', 'humidity_pct', 61.5, '%', 'good'),
  (now() - INTERVAL '10 minutes', '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-002', 'GW-PUN-001', 'chamber_temp_c', 4.2, '°C', 'good'),
  (now() - INTERVAL '5 minutes',  '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-002', 'GW-PUN-001', 'chamber_temp_c', 3.9, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-002', 'GW-PUN-001', 'chamber_temp_c', 4.1, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'cold', 'DEV-COLD-002', 'GW-PUN-001', 'humidity_pct', 54.8, '%', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'home', 'DEV-HOME-001', 'GW-PUN-001', 'indoor_temp_c', 22.4, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'home', 'DEV-HOME-001', 'GW-PUN-001', 'indoor_aqi', 34.0, 'AQI', 'good')
ON CONFLICT DO NOTHING;
