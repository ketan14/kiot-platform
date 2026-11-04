-- ==============================================================================
-- KIOT Platform: TimescaleDB Continuous Aggregates & Retention Policies
-- Migration: 20261104000003_timescale_aggregates.sql
-- ==============================================================================

-- 1. 1-Minute Continuous Aggregate Rollup View
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1m_rollup
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  organization_id,
  product_id,
  device_id,
  metric,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(value) AS sample_count
FROM telemetry_readings
GROUP BY bucket, organization_id, product_id, device_id, metric
WITH NO DATA;

-- Schedule 1-minute rollup refresh policy
SELECT add_continuous_aggregate_policy(
  'telemetry_1m_rollup',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE
);

-- 2. 1-Hour Continuous Aggregate Rollup View
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1h_rollup
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  organization_id,
  product_id,
  device_id,
  metric,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(value) AS sample_count
FROM telemetry_readings
GROUP BY bucket, organization_id, product_id, device_id, metric
WITH NO DATA;

-- Schedule 1-hour rollup refresh policy
SELECT add_continuous_aggregate_policy(
  'telemetry_1h_rollup',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- 3. Automatic Data Retention Policy
-- Retain raw high-frequency telemetry for 90 days; rollups are preserved indefinitely
SELECT add_retention_policy('telemetry_readings', INTERVAL '90 days', if_not_exists => TRUE);

