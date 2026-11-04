-- ==============================================================================
-- KIOT Platform: Development Seed Data
-- Seed Script: supabase/seed/seed.sql
-- ==============================================================================

-- 1. Products Catalog
INSERT INTO products (id, name, description, is_active) VALUES
  ('industrial', 'KIOT Industrial', 'Industrial machine and factory supervisory monitoring', true),
  ('cold', 'KIOT Cold', 'Cold storage, temperature logging and HACCP compliance', true),
  ('home', 'KIOT Home', 'Smart residential home automation and device control', true),
  ('energy', 'KIOT Energy', 'Commercial and industrial energy monitoring and management', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Organization (Tenant)
INSERT INTO organizations (id, name, slug, logo_url, is_active) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Apex Precision Manufacturing Ltd.', 'apex-manufacturing', NULL, true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Demo User Profiles
INSERT INTO user_profiles (id, email, full_name, avatar_url) VALUES
  ('00000000-0000-4000-b000-000000000001', 'admin@apex.kiot.io', 'Rajesh Sharma', NULL),
  ('00000000-0000-4000-b000-000000000002', 'operator@apex.kiot.io', 'Amit Patel', NULL)
ON CONFLICT (email) DO NOTHING;

-- 4. Organization Memberships
INSERT INTO organization_memberships (id, organization_id, user_id, role, status) VALUES
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', 'owner', 'active'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000002', 'operator', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 5. Product Subscriptions
INSERT INTO organization_subscriptions (id, organization_id, product_id, status, plan_tier, device_limit, user_limit) VALUES
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000001', 'industrial', 'active', 'enterprise', 50, 15),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000001', 'energy', 'active', 'standard', 20, 10)
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- 6. Hierarchical Locations (Site -> Building -> Line)
INSERT INTO locations (id, organization_id, parent_id, name, code, type, address) VALUES
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000001', NULL, 'Pune Factory Unit 1', 'PUN-01', 'site', '{"city": "Pune", "state": "Maharashtra", "country": "India"}'::jsonb),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000001', 'Main CNC Machine Shop', 'BLD-A', 'building', NULL),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000002', 'Production Line 1', 'LINE-01', 'line', NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. Industrial Gateway
INSERT INTO gateways (id, organization_id, location_id, name, model, ip_address, status, last_heartbeat_at) VALUES
  ('GW-PUN-001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000002', 'Moxa UC-8100 Gateway', 'Moxa Linux Edge Gateway', '192.168.1.100', 'online', now())
ON CONFLICT (id) DO NOTHING;

-- 8. Devices
INSERT INTO devices (id, organization_id, product_id, gateway_id, location_id, name, hardware_type, hardware_serial, firmware_version, status, last_seen_at) VALUES
  ('DEV-ESP32-001', '00000000-0000-4000-a000-000000000001', 'industrial', 'GW-PUN-001', '00000000-0000-4000-e000-000000000003', 'CNC-01 Sensor Node', 'esp32', 'SN-ESP32-849201', '1.2.0', 'online', now()),
  ('DEV-METER-001', '00000000-0000-4000-a000-000000000001', 'energy', 'GW-PUN-001', '00000000-0000-4000-e000-000000000002', 'Main Feeder Energy Meter', 'third_party', 'SN-MTR-994821', '2.0.1', 'online', now())
ON CONFLICT (id) DO NOTHING;

-- 9. Device Shadows
INSERT INTO device_shadows (device_id, organization_id, desired, reported, delta, version) VALUES
  ('DEV-ESP32-001', '00000000-0000-4000-a000-000000000001', '{"relay_coolant": "ON", "sample_rate_ms": 1000}'::jsonb, '{"relay_coolant": "ON", "sample_rate_ms": 1000}'::jsonb, '{}'::jsonb, 1)
ON CONFLICT (device_id) DO NOTHING;

-- 10. Industrial Machines
INSERT INTO industrial_machines (id, organization_id, location_id, primary_device_id, name, machine_code, category, status, current_operating_hours, last_status_change_at) VALUES
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000003', 'DEV-ESP32-001', 'CNC Milling Machine 01', 'CNC-01', 'Milling', 'running', 142.50, now() - INTERVAL '3 hours'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000003', NULL, 'Precision Lathe Machine 02', 'LATHE-02', 'Lathe', 'stopped', 86.20, now() - INTERVAL '1 day')
ON CONFLICT (organization_id, machine_code) DO NOTHING;

-- 11. Sample Telemetry Readings (Historical & Recent)
INSERT INTO telemetry_readings (time, organization_id, product_id, device_id, gateway_id, metric, value, unit, quality) VALUES
  (now() - INTERVAL '15 minutes', '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'temperature', 68.4, '°C', 'good'),
  (now() - INTERVAL '10 minutes', '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'temperature', 69.1, '°C', 'good'),
  (now() - INTERVAL '5 minutes',  '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'temperature', 71.0, '°C', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'temperature', 70.8, '°C', 'good'),
  (now() - INTERVAL '15 minutes', '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'spindle_rpm', 3450.0, 'RPM', 'good'),
  (now() - INTERVAL '10 minutes', '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'spindle_rpm', 3465.0, 'RPM', 'good'),
  (now() - INTERVAL '5 minutes',  '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'spindle_rpm', 3455.0, 'RPM', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'industrial', 'DEV-ESP32-001', 'GW-PUN-001', 'spindle_rpm', 3450.0, 'RPM', 'good'),
  (now() - INTERVAL '15 minutes', '00000000-0000-4000-a000-000000000001', 'energy', 'DEV-METER-001', 'GW-PUN-001', 'active_power', 45.2, 'kW', 'good'),
  (now() - INTERVAL '10 minutes', '00000000-0000-4000-a000-000000000001', 'energy', 'DEV-METER-001', 'GW-PUN-001', 'active_power', 46.8, 'kW', 'good'),
  (now() - INTERVAL '5 minutes',  '00000000-0000-4000-a000-000000000001', 'energy', 'DEV-METER-001', 'GW-PUN-001', 'active_power', 47.1, 'kW', 'good'),
  (now() - INTERVAL '1 minute',   '00000000-0000-4000-a000-000000000001', 'energy', 'DEV-METER-001', 'GW-PUN-001', 'active_power', 46.5, 'kW', 'good')
ON CONFLICT DO NOTHING;
