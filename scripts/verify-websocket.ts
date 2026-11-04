/**
 * Automated Verification Script for KIOT WebSocket Gateway (Phase 5)
 * Tests:
 * 1. Healthcheck endpoint
 * 2. Unauthenticated connection rejection (400)
 * 3. Unauthorized org connection rejection (403)
 * 4. Successful authenticated connection (200 / 101 Switching Protocols)
 * 5. Welcome event reception
 * 6. Device subscription filtering
 * 7. Real-time Redis Pub/Sub fan-out delivery
 * 8. Ping / Pong message loop
 */

import { WebSocket } from 'ws';
import { Redis } from 'ioredis';

const WS_PORT = process.env.WS_PORT || 3001;
const WS_URL = `ws://localhost:${WS_PORT}`;
const HTTP_URL = `http://localhost:${WS_PORT}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

const VALID_ORG_ID = '00000000-0000-4000-a000-000000000001'; // Apex Precision Manufacturing
const INVALID_ORG_ID = '11111111-2222-3333-4444-555555555555';
const TEST_DEVICE_ID = 'DEV-ESP32-001';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting KIOT WebSocket Gateway Verification Suite');
  console.log('====================================================\n');

  // Test 1: Healthcheck endpoint
  console.log('▶ [Test 1] Checking HTTP Health Endpoint...');
  const healthRes = await fetch(`${HTTP_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Healthcheck failed with status: ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  console.log('  ✔ Health response:', JSON.stringify(healthData));

  // Test 2: Connection rejected when org_id missing (400)
  console.log('\n▶ [Test 2] Testing connection without org_id (expect rejection)...');
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      reject(new Error('Connection should have been rejected!'));
    });
    ws.on('error', () => {
      // Expected to fail upgrade
      console.log('  ✔ Connection without org_id rejected as expected');
      resolve();
    });
  });

  // Test 3: Connection rejected when org_id is unauthorized/unknown (403)
  console.log('\n▶ [Test 3] Testing connection with invalid org_id (expect 403 rejection)...');
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?org_id=${INVALID_ORG_ID}`);
    ws.on('open', () => {
      reject(new Error('Unauthorized org connection should have been rejected!'));
    });
    ws.on('error', () => {
      console.log('  ✔ Unauthorized organization connection rejected as expected');
      resolve();
    });
  });

  // Test 4 & 5: Valid Connection & Welcome Message
  console.log('\n▶ [Test 4 & 5] Connecting with valid tenant credentials & checking welcome event...');
  const redisPublisher = new Redis(REDIS_URL);

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?org_id=${VALID_ORG_ID}`);
    let welcomeReceived = false;
    let telemetryReceived = false;

    const timeout = setTimeout(() => {
      ws.close();
      redisPublisher.disconnect();
      reject(new Error('Verification timed out after 10 seconds!'));
    }, 10000);

    ws.on('open', () => {
      console.log('  ✔ WebSocket connection successfully established (101 Switching Protocols)');
    });

    ws.on('message', async (data: Buffer) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'CONNECTION_ESTABLISHED') {
        welcomeReceived = true;
        console.log('  ✔ Welcome payload received:', JSON.stringify(msg));

        // Test 6: Subscribe to specific device
        console.log('\n▶ [Test 6] Sending device subscription request...');
        ws.send(JSON.stringify({ action: 'subscribe_device', deviceId: TEST_DEVICE_ID }));
      } else if (msg.status === 'subscribed' && msg.deviceId === TEST_DEVICE_ID) {
        console.log('  ✔ Device subscription confirmed for:', msg.deviceId);

        // Test 7: Publish Redis Telemetry event and verify fan-out
        console.log('\n▶ [Test 7] Publishing simulated telemetry to Redis Pub/Sub...');
        const testTelemetryEvent = {
          deviceId: TEST_DEVICE_ID,
          organizationId: VALID_ORG_ID,
          metric: 'vibration_rms',
          value: 2.45,
          unit: 'mm/s',
          timestamp: new Date().toISOString(),
        };

        const channel = `org:${VALID_ORG_ID}:telemetry`;
        await redisPublisher.publish(channel, JSON.stringify(testTelemetryEvent));
        console.log(`  ✔ Published event to Redis channel: ${channel}`);
      } else if (msg.deviceId === TEST_DEVICE_ID && msg.metric === 'vibration_rms') {
        telemetryReceived = true;
        console.log('  ✔ LIVE TELEMETRY RECEIVED VIA WEBSOCKET:', JSON.stringify(msg));

        // Test 8: Ping / Pong check
        console.log('\n▶ [Test 8] Testing Ping/Pong protocol...');
        ws.send(JSON.stringify({ action: 'ping' }));
      } else if (msg.action === 'pong') {
        console.log('  ✔ Pong received with timestamp:', msg.timestamp);

        clearTimeout(timeout);
        ws.close();
        redisPublisher.disconnect();
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      redisPublisher.disconnect();
      reject(err);
    });
  });

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 5 WEBSOCKET VERIFICATION TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

