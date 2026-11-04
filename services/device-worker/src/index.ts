import mqtt from 'mqtt';
import { config } from './config.js';
import { handleTelemetryMessage } from './handlers/telemetry.js';
import { handleStateMessage } from './handlers/state.js';
import { handleCommandAckMessage } from './handlers/command-ack.js';
import { telemetryBuffer } from './buffer.js';
import { pool } from './db.js';
import { redis } from './redis.js';

const workerInstance = process.env.WORKER_INSTANCE || process.env.NODE_APP_INSTANCE || 'dev';
const clientId = `kiot_device_worker_${workerInstance}_${process.pid}`;
const brokerUrl = `mqtt://${config.EMQX_HOST}:${config.EMQX_PORT}`;

console.log(`
==================================================================
🚀 KIOT IoT Device Ingestion Worker Starting...
==================================================================
  • Broker:         ${brokerUrl}
  • Client ID:      ${clientId}
  • Flush Interval: ${config.BATCH_FLUSH_INTERVAL_MS}ms
  • Max Batch Size: ${config.BATCH_MAX_SIZE}
==================================================================
`);

const client = mqtt.connect(brokerUrl, {
  clientId,
  clean: true, // Auto-cleanup disconnected sessions in development to prevent queue trapping
  connectTimeout: 5000,
  reconnectPeriod: 2000,
});

// Shared Subscriptions pattern to load-balance traffic across multiple workers
const SHARED_TOPICS = [
  '$share/ingestion_group/kiot/+/devices/+/telemetry',
  '$share/ingestion_group/kiot/+/devices/+/state',
  '$share/ingestion_group/kiot/+/devices/+/commands/+/ack',
];

client.on('connect', () => {
  console.log(`[Worker] Connected to EMQX Broker. Subscribing to shared topics...`);
  client.subscribe(SHARED_TOPICS, { qos: 1 }, (err, granted) => {
    if (err) {
      console.error('[Worker] Subscription error:', err);
    } else {
      console.log('[Worker] Successfully subscribed to:');
      granted?.forEach((g) => console.log(`   • ${g.topic} (QoS: ${g.qos})`));
    }
  });
});

client.on('message', (topic: string, message: Buffer) => {
  console.log(`[Worker] Received MQTT message on: ${topic}`);
  const parts = topic.split('/');
  // Topic formats:
  // kiot/{org}/devices/{device}/telemetry (parts length: 5)
  // kiot/{org}/devices/{device}/state (parts length: 5)
  // kiot/{org}/devices/{device}/commands/{cmdId}/ack (parts length: 7)

  const action = parts[4];

  if (action === 'telemetry') {
    void handleTelemetryMessage(parts, message);
  } else if (action === 'state') {
    void handleStateMessage(parts, message);
  } else if (action === 'commands' && parts[6] === 'ack') {
    void handleCommandAckMessage(parts, message);
  }
});

client.on('error', (err) => {
  console.error('[Worker MQTT Error]:', err.message);
});

// Graceful Shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Worker] Received ${signal}. Gracefully shutting down...`);

  client.end(true, () => {
    console.log('[Worker] MQTT client disconnected.');
  });

  await telemetryBuffer.close();
  console.log('[Worker] Flushed remaining in-memory batches.');

  await pool.end();
  redis.disconnect();

  console.log('[Worker] Closed DB & Redis connections. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
