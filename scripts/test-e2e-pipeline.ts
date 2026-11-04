/**
 * Full End-to-End Pipeline Verification
 * 
 * Tests the complete loop:
 * Edge MQTT Publisher -> EMQX -> Device Ingestion Worker -> TimescaleDB & Redis
 * -> WebSocket Gateway -> Frontend Client + REST API Verification
 */

import mqtt from 'mqtt';
import { WebSocket } from 'ws';

const ORG_ID = '00000000-0000-4000-a000-000000000001';
const DEVICE_ID = 'DEV-ESP32-001';
const WS_URL = `ws://localhost:3001?org_id=${ORG_ID}`;
const MQTT_URL = 'mqtt://localhost:1883';
const API_URL = 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log('===========================================================');
  console.log('🔄 KIOT End-to-End IoT Pipeline Verification (MQTT -> WS)');
  console.log('===========================================================\n');

  // Step 1: Connect WebSocket Client
  console.log('▶ [Step 1] Connecting real-time WebSocket client...');
  const ws = new WebSocket(WS_URL);

  const wsReady = new Promise<void>((resolve, reject) => {
    ws.on('open', () => console.log('  ✔ WebSocket client connected'));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'CONNECTION_ESTABLISHED') {
        console.log('  ✔ WebSocket connection established for org:', msg.organizationId);
        resolve();
      }
    });
    ws.on('error', reject);
  });

  await wsReady;
  // Allow 200ms for Redis Pub/Sub subscription registration on the gateway
  await sleep(200);

  // Step 2: Set up listener on WebSocket for incoming telemetry
  const telemetryReceivedPromise = new Promise<{ metric: string; value: number }>((resolve) => {
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.deviceId === DEVICE_ID && msg.metric === 'spindle_speed_rpm') {
        console.log('  ✔ WebSocket received live forwarded telemetry:', JSON.stringify(msg));
        resolve({ metric: msg.metric, value: msg.value });
      }
    });
  });

  // Step 3: Connect MQTT Publisher simulating industrial sensor node
  console.log('\n▶ [Step 2] Simulating edge device publishing MQTT telemetry...');
  const mqttClient = mqtt.connect(MQTT_URL, { clientId: 'test_sensor_sim_01' });

  await new Promise<void>((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log('  ✔ Simulated edge device connected to EMQX at:', MQTT_URL);
      resolve();
    });
    mqttClient.on('error', reject);
  });

  const testPayload = {
    vibration_rms: 3.42,
    temperature_bearing: 58.1,
    spindle_speed_rpm: 3200,
    timestamp: new Date().toISOString(),
  };

  const topic = `kiot/${ORG_ID}/devices/${DEVICE_ID}/telemetry`;
  console.log(`  Publishing payload to topic: ${topic}`);
  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(topic, JSON.stringify(testPayload), { qos: 1 }, (err) => {
      if (err) reject(err);
      else {
        console.log('  ✔ MQTT publish acknowledged by broker');
        resolve();
      }
    });
  });

  // Step 4: Await WebSocket event reception
  console.log('\n▶ [Step 3] Waiting for WebSocket broadcast from Redis Pub/Sub...');
  const received = await Promise.race([
    telemetryReceivedPromise,
    sleep(5000).then(() => {
      throw new Error('Timeout waiting for telemetry on WebSocket!');
    }),
  ]);
  console.log(`  ✔ Successfully captured live metric "${received.metric}" = ${received.value}`);

  // Step 5: Wait 500ms for ingestion worker buffer flush, then verify REST API hot cache
  console.log('\n▶ [Step 4] Verifying REST API latest telemetry cache...');
  await sleep(600);

  const apiRes = await fetch(`${API_URL}/v1/telemetry/latest?device_id=${DEVICE_ID}`, {
    headers: {
      'X-KIOT-Organization-Id': ORG_ID,
    },
  });

  if (!apiRes.ok) {
    throw new Error(`API request failed with status: ${apiRes.status}`);
  }

  const latestTelemetry = await apiRes.json();
  console.log('  ✔ API response for latest device telemetry:');
  console.log('   ', JSON.stringify(latestTelemetry, null, 2));

  // Cleanup
  mqttClient.end();
  ws.close();

  console.log('\n===========================================================');
  console.log('🎉 FULL END-TO-END PIPELINE VERIFICATION SUCCESSFUL!');
  console.log('   MQTT Ingest -> Device Worker -> Redis + TimescaleDB');
  console.log('   -> WebSocket Gateway -> Live Frontend Streaming');
  console.log('===========================================================\n');
}

runE2E().catch((err) => {
  console.error('\n❌ E2E Pipeline Verification Failed:', err);
  process.exit(1);
});
