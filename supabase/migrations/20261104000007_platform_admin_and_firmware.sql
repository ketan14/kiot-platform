-- ==============================================================================
-- Migration: 20261104000007_platform_admin_and_firmware.sql
-- Description: Add OTA firmware_releases table, platform_role column on user_profiles,
--              subscription RLS policies, and seed initial ESP32 & Gateway firmware
-- ==============================================================================

-- 1. Add platform_role to user_profiles for internal KIOT Super Admins / Operators
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS platform_role platform_role;

UPDATE user_profiles
SET platform_role = 'super_admin'
WHERE email = 'admin@apex.kiot.io';

-- 2. OTA Firmware Releases Registry
CREATE TABLE IF NOT EXISTS firmware_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  hardware_type VARCHAR(50) NOT NULL DEFAULT 'esp32',
  product_id product_type NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  release_notes TEXT,
  checksum_sha256 VARCHAR(128) NOT NULL,
  binary_size_bytes INT NOT NULL DEFAULT 1048576,
  is_stable BOOLEAN NOT NULL DEFAULT true,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INT NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_firmware_version_hw UNIQUE (version, hardware_type, product_id)
);
CREATE INDEX IF NOT EXISTS idx_firmware_releases_product ON firmware_releases(product_id, hardware_type);

-- 3. Add RLS policy for organization_subscriptions so tenant admins can view/manage subscriptions
DROP POLICY IF EXISTS subscriptions_select ON organization_subscriptions;
CREATE POLICY subscriptions_select ON organization_subscriptions
  FOR SELECT USING (app.is_org_member(organization_id));

DROP POLICY IF EXISTS subscriptions_manage ON organization_subscriptions;
CREATE POLICY subscriptions_manage ON organization_subscriptions
  FOR ALL USING (app.get_org_role(organization_id) IN ('owner', 'admin'));

-- 4. Seed initial OTA Firmware Releases
INSERT INTO firmware_releases (
  id, version, hardware_type, product_id, release_notes,
  checksum_sha256, binary_size_bytes, is_stable, is_mandatory, rollout_percentage
) VALUES
  (
    '00000000-0000-4000-f100-000000000001',
    '1.2.0',
    'esp32',
    'industrial',
    'Production ESP-IDF release with high-frequency FFT spindle vibration sampling, hardware watchdog recovery, and mTLS QoS-1 command ACK.',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    1342177,
    true,
    false,
    100
  ),
  (
    '00000000-0000-4000-f100-000000000002',
    '1.3.0-rc1',
    'esp32',
    'industrial',
    'Canary OTA build: BLE Wi-Fi reprovisioning support and 250ms local ring-buffer flash persistence during broker disconnects.',
    '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    1415577,
    false,
    false,
    25
  ),
  (
    '00000000-0000-4000-f100-000000000003',
    '2.0.1',
    'third_party',
    'energy',
    'Modbus RTU RS-485 3-phase smart energy meter bridge profile (kW, kVA, PF, THD harmonic registers).',
    '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    892416,
    true,
    true,
    100
  ),
  (
    '00000000-0000-4000-f100-000000000004',
    '3.1.0',
    'linux_gateway',
    'industrial',
    'Moxa UC-8100 Edge Gateway Agent daemon with local SQLite store-and-forward offline telemetry queue.',
    'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    18454937,
    true,
    false,
    100
  )
ON CONFLICT (version, hardware_type, product_id) DO NOTHING;

-- 5. Seed initial platform audit log entries
INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
SELECT
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-b000-000000000001',
  'firmware.published',
  'firmware_release',
  '1.2.0',
  '{"hardwareType": "esp32", "product": "industrial", "rollout": 100}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'firmware.published');
