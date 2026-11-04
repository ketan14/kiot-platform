import { Redis } from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redis.on('connect', () => {
  console.log('[Worker Redis] Connected to:', config.REDIS_URL);
});

redis.on('error', (err) => {
  console.error('[Worker Redis Error]:', err.message);
});

/**
 * Update hot telemetry cache for immediate sub-millisecond retrieval
 */
export async function updateHotTelemetryCache(
  deviceId: string,
  metric: string,
  value: number,
  unit: string,
  timestamp: string
): Promise<void> {
  const key = `device:${deviceId}:latest`;
  const field = metric;
  const payload = JSON.stringify({ value, unit, timestamp });

  try {
    await redis.hset(key, field, payload);
    await redis.expire(key, 86400); // 24-hour TTL
  } catch (err) {
    console.error(`[Worker Redis] Failed to update hot cache for ${deviceId}:`, err);
  }
}

/**
 * Publish live event to Redis Pub/Sub for WebSocket fanout
 */
export async function publishTelemetryEvent(
  organizationId: string,
  event: Record<string, unknown>
): Promise<void> {
  const channel = `org:${organizationId}:telemetry`;
  try {
    await redis.publish(channel, JSON.stringify(event));
  } catch (err) {
    console.error(`[Worker Redis] Failed to publish event to ${channel}:`, err);
  }
}

