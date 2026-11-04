import { pool } from '../db.js';
import { publishTelemetryEvent } from '../redis.js';
import { AlertRule, Incident } from '@kiot/shared-types';

interface CachedRule {
  id: string;
  organizationId: string;
  productId: string;
  deviceId: string | null;
  name: string;
  description: string | null;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
  isEnabled: boolean;
}

export class AlertEvaluator {
  private rules: CachedRule[] = [];
  // Key: `${ruleId}:${deviceId}` -> active incident
  private activeIncidents = new Map<string, Incident>();
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {}

  public async start(): Promise<void> {
    await this.refreshRules();
    await this.loadActiveIncidents();

    // Refresh rules cache every 15 seconds
    this.refreshTimer = setInterval(() => {
      void this.refreshRules();
    }, 15000);

    console.log('[Alert Evaluator] ✔ Rules engine initialized and listening');
  }

  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  public async refreshRules(): Promise<void> {
    try {
      const res = await pool.query(`
        SELECT id, organization_id as "organizationId", product_id as "productId", 
               device_id as "deviceId", name, description, metric, condition, 
               threshold, severity, is_enabled as "isEnabled"
        FROM alert_rules 
        WHERE is_enabled = true;
      `);
      this.rules = res.rows as CachedRule[];
    } catch (err) {
      console.error('[Alert Evaluator] Failed to refresh alert rules:', err);
    }
  }

  public async loadActiveIncidents(): Promise<void> {
    try {
      const res = await pool.query(`
        SELECT id, organization_id, rule_id, device_id, metric, trigger_value, 
               threshold_value, severity, status, title, message, 
               acknowledged_by, acknowledged_at, resolved_by, resolved_at, 
               created_at, updated_at
        FROM incidents
        WHERE status IN ('OPEN', 'ACKNOWLEDGED');
      `);

      this.activeIncidents.clear();
      for (const row of res.rows) {
        if (row.rule_id && row.device_id) {
          const key = `${row.rule_id}:${row.device_id}`;
          this.activeIncidents.set(key, row as Incident);
        }
      }
    } catch (err) {
      console.error('[Alert Evaluator] Failed to load active incidents:', err);
    }
  }

  private checkCondition(val: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'GT':
        return val > threshold;
      case 'GTE':
        return val >= threshold;
      case 'LT':
        return val < threshold;
      case 'LTE':
        return val <= threshold;
      case 'EQ':
        return Math.abs(val - threshold) < 0.0001;
      case 'NEQ':
        return Math.abs(val - threshold) >= 0.0001;
      default:
        return false;
    }
  }

  /**
   * Evaluate a single telemetry metric reading against configured alert rules
   */
  public async evaluateReading(reading: {
    organizationId: string;
    deviceId: string;
    metric: string;
    value: number;
    unit: string;
    timestamp: string;
  }): Promise<void> {
    const { organizationId, deviceId, metric, value, unit } = reading;

    // Filter rules matching this organization and metric
    const matchingRules = this.rules.filter((r) => {
      if (r.organizationId !== organizationId) return false;
      if (r.metric !== metric) return false;
      if (r.deviceId && r.deviceId !== deviceId) return false;
      return true;
    });

    if (matchingRules.length === 0) return;

    for (const rule of matchingRules) {
      const isBreached = this.checkCondition(value, rule.condition, rule.threshold);
      const incidentKey = `${rule.id}:${deviceId}`;
      const existingIncident = this.activeIncidents.get(incidentKey);

      if (isBreached) {
        if (!existingIncident) {
          // Trigger new incident
          const title = `${rule.name} on ${deviceId}`;
          const message = `Metric '${metric}' breached threshold (${value.toFixed(2)}${unit} ${rule.condition} ${rule.threshold}${unit})`;

          try {
            const insertRes = await pool.query(
              `INSERT INTO incidents (
                organization_id, rule_id, device_id, metric, trigger_value, threshold_value,
                severity, status, title, message
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $8, $9)
              RETURNING id, organization_id, rule_id, device_id, metric, trigger_value, threshold_value,
                        severity, status, title, message, created_at, updated_at;`,
              [
                organizationId,
                rule.id,
                deviceId,
                metric,
                value,
                rule.threshold,
                rule.severity,
                title,
                message,
              ]
            );

            const newIncident = insertRes.rows[0] as Incident;
            this.activeIncidents.set(incidentKey, newIncident);

            console.log(
              `[Alert Evaluator] 🚨 INCIDENT TRIGGERED: [${rule.severity}] ${title} -> Value: ${value.toFixed(2)}${unit}`
            );

            // Broadcast incident event over Redis Pub/Sub for real-time WebSocket popups
            void publishTelemetryEvent(organizationId, {
              type: 'INCIDENT_TRIGGERED',
              organizationId,
              deviceId,
              incident: newIncident,
            });
          } catch (err) {
            console.error('[Alert Evaluator] Error recording incident:', err);
          }
        }
      } else {
        // Value has returned to normal range
        if (existingIncident && existingIncident.status === 'OPEN') {
          // Auto-resolve incident
          try {
            await pool.query(
              `UPDATE incidents 
               SET status = 'RESOLVED', resolved_at = now(), updated_at = now() 
               WHERE id = $1 AND status = 'OPEN';`,
              [existingIncident.id]
            );

            this.activeIncidents.delete(incidentKey);

            console.log(
              `[Alert Evaluator] 🟢 INCIDENT AUTO-RESOLVED: ${rule.name} on ${deviceId} (Value normalized to ${value.toFixed(2)}${unit})`
            );

            void publishTelemetryEvent(organizationId, {
              type: 'INCIDENT_RESOLVED',
              organizationId,
              deviceId,
              incidentId: existingIncident.id,
              metric,
            });
          } catch (err) {
            console.error('[Alert Evaluator] Error resolving incident:', err);
          }
        }
      }
    }
  }
}

export const alertEvaluator = new AlertEvaluator();

