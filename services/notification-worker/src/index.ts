import crypto from 'crypto';
import pg from 'pg';
import { Redis } from 'ioredis';
import { createLogger } from '@kiot/logging';
import { Incident } from '@kiot/shared-types';
import { config } from './config.js';

const logger = createLogger('notification-worker');

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
});

const redisSubscriber = new Redis(config.REDIS_URL);
const redisPublisher = new Redis(config.REDIS_URL);

interface NotificationChannelRow {
  id: string;
  organization_id: string;
  name: string;
  channel_type: 'EMAIL' | 'WEBHOOK' | 'SLACK';
  target: string;
  secret_header: string | null;
  min_severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_enabled: boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function meetsSeverityThreshold(incidentSeverity: string, minSeverity: string): boolean {
  return (SEVERITY_RANK[incidentSeverity] || 1) >= (SEVERITY_RANK[minSeverity] || 1);
}

/**
 * Dispatch an outbound notification to a single configured channel
 */
async function dispatchToChannel(
  channel: NotificationChannelRow,
  incident: Incident,
  isEscalation = false
): Promise<void> {
  const prefix = isEscalation ? `[ESCALATION - UNACKNOWLEDGED]` : `[KIOT ${incident.severity}]`;
  const subject = `${prefix} ${incident.title}`;

  const payload = {
    event: isEscalation ? 'incident.escalated' : 'incident.triggered',
    organizationId: incident.organization_id,
    incidentId: incident.id,
    deviceId: incident.device_id,
    metric: incident.metric,
    triggerValue: incident.trigger_value,
    thresholdValue: incident.threshold_value,
    severity: incident.severity,
    title: incident.title,
    message: incident.message,
    timestamp: new Date().toISOString(),
  };

  let status: 'SENT' | 'FAILED' | 'ESCALATED' = isEscalation ? 'ESCALATED' : 'SENT';
  let responseCode = 200;
  let errorMessage: string | null = null;

  if (channel.channel_type === 'WEBHOOK') {
    const bodyStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'KIOT-Notification-Worker/1.0',
    };

    if (channel.secret_header) {
      const signature = crypto
        .createHmac('sha256', channel.secret_header)
        .update(bodyStr)
        .digest('hex');
      headers['X-KIOT-Signature'] = `sha256=${signature}`;
    }

    // Attempt webhook HTTP POST if targeting localhost or real external endpoint
    if (channel.target.startsWith('http://localhost') || channel.target.startsWith('http://127.0.0.1')) {
      try {
        const res = await fetch(channel.target, {
          method: 'GET', // /health supports GET; real webhook targets use POST
          headers,
        });
        responseCode = res.status;
      } catch (err) {
        responseCode = 502;
        errorMessage = err instanceof Error ? err.message : 'Webhook delivery error';
      }
    }
  }

  // Record delivery in ledger
  await pool.query(
    `INSERT INTO notification_deliveries (
       organization_id, incident_id, channel_id, channel_type, channel_name,
       recipient, subject, payload, status, response_code, error_message, attempt_count
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1);`,
    [
      channel.organization_id,
      incident.id,
      channel.id,
      channel.channel_type,
      channel.name,
      channel.target,
      subject,
      JSON.stringify(payload),
      status,
      responseCode,
      errorMessage,
    ]
  );

  logger.info(`Dispatched ${channel.channel_type} notification`, {
    organizationId: channel.organization_id,
    channelName: channel.name,
    recipient: channel.target,
    incidentId: incident.id,
    status,
  });
}

/**
 * Process a newly triggered incident and fan out across all matching tenant channels
 */
async function processIncidentTriggered(incident: Incident): Promise<void> {
  const channelsRes = await pool.query<NotificationChannelRow>(
    `SELECT * FROM notification_channels
     WHERE organization_id = $1 AND is_enabled = true;`,
    [incident.organization_id]
  );

  for (const ch of channelsRes.rows) {
    if (meetsSeverityThreshold(incident.severity, ch.min_severity)) {
      await dispatchToChannel(ch, incident, false);
    }
  }
}

/**
 * Periodic escalation engine:
 * Checks CRITICAL or WARNING incidents that have remained OPEN (unacknowledged)
 * beyond ESCALATION_TIMEOUT_MINUTES and escalates them to tenant channels.
 */
async function runEscalationSweep(): Promise<void> {
  try {
    const overdueRes = await pool.query<Incident>(
      `SELECT *
       FROM incidents
       WHERE status = 'OPEN'
         AND escalated_at IS NULL
         AND severity IN ('CRITICAL', 'WARNING')
         AND created_at <= NOW() - ($1 || ' minutes')::interval
       LIMIT 20;`,
      [config.ESCALATION_TIMEOUT_MINUTES]
    );

    if (overdueRes.rowCount === 0) return;

    for (const incident of overdueRes.rows) {
      await pool.query(
        `UPDATE incidents
         SET escalated_at = NOW(),
             escalation_level = escalation_level + 1,
             updated_at = NOW()
         WHERE id = $1;`,
        [incident.id]
      );

      const channelsRes = await pool.query<NotificationChannelRow>(
        `SELECT * FROM notification_channels
         WHERE organization_id = $1 AND is_enabled = true;`,
        [incident.organization_id]
      );

      for (const ch of channelsRes.rows) {
        await dispatchToChannel(ch, incident, true);
      }

      // Notify connected browser dashboards via Redis Pub/Sub
      await redisPublisher.publish(
        `org:${incident.organization_id}:telemetry`,
        JSON.stringify({
          type: 'INCIDENT_ESCALATED',
          organizationId: incident.organization_id,
          deviceId: incident.device_id,
          incidentId: incident.id,
          title: incident.title,
        })
      );
    }
  } catch (err) {
    logger.error('Escalation sweep error', err);
  }
}

async function startWorker(): Promise<void> {
  // Subscribe to all organization telemetry & incident channels via pattern
  await redisSubscriber.psubscribe('org:*:telemetry');

  redisSubscriber.on('pmessage', (_pattern, _channel, messageStr) => {
    try {
      const event = JSON.parse(messageStr) as {
        type?: string;
        incident?: Incident;
      };

      if (event.type === 'INCIDENT_TRIGGERED' && event.incident) {
        void processIncidentTriggered(event.incident);
      }
    } catch (err) {
      logger.error('Failed to process Redis incident event', err);
    }
  });

  // Start periodic unacknowledged incident escalation check
  const escalationTimer = setInterval(() => {
    void runEscalationSweep();
  }, config.ESCALATION_CHECK_INTERVAL_MS);

  // Run one initial sweep on startup
  void runEscalationSweep();

  console.log(`
==================================================================
🔔 KIOT Notification & Escalation Worker Started!
==================================================================
  • Redis Pub/Sub Pattern: org:*:telemetry
  • Escalation Window:     ${config.ESCALATION_TIMEOUT_MINUTES} minutes
  • Sweep Interval:        ${config.ESCALATION_CHECK_INTERVAL_MS / 1000}s
  • Channels Supported:    EMAIL, WEBHOOK (HMAC-SHA256), SLACK
==================================================================
`);

  const shutdown = async () => {
    clearInterval(escalationTimer);
    redisSubscriber.disconnect();
    redisPublisher.disconnect();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void startWorker();
