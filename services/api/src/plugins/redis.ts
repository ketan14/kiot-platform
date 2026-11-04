import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully to:', config.REDIS_URL);
});

redis.on('error', (err) => {
  console.error('[Redis Error]:', err.message);
});

/**
 * Fetch latest device shadow state from Redis hot cache (Hash format)
 */
export async function getDeviceLatestState(deviceId: string): Promise<Record<string, unknown> | null> {
  const hash = await redis.hgetall(`device:${deviceId}:latest`);
  if (!hash || Object.keys(hash).length === 0) return null;

  const result: Record<string, unknown> = {};
  for (const [metric, jsonStr] of Object.entries(hash)) {
    try {
      result[metric] = JSON.parse(jsonStr);
    } catch {
      result[metric] = jsonStr;
    }
  }
  return result;
}

/**
 * Cache latest device state in Redis
 */
export async function setDeviceLatestState(
  deviceId: string,
  state: Record<string, unknown>,
  ttlSeconds = 86400
): Promise<void> {
  await redis.set(`device:${deviceId}:latest`, JSON.stringify(state), 'EX', ttlSeconds);
}

