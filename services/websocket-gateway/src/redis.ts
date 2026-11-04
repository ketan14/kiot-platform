import { Redis } from 'ioredis';
import { config } from './config.js';

export const redisSubscriber = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisSubscriber.on('connect', () => {
  console.log('[WS Gateway Redis] Connected to Pub/Sub bus:', config.REDIS_URL);
});

redisSubscriber.on('error', (err) => {
  console.error('[WS Gateway Redis Error]:', err.message);
});

