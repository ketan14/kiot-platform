# Platform Smoke Testing Procedures

This document provides step-by-step verification commands to smoke test the platform locally.

---

## Smoke Test 1: Backing Containers Verification

Ensure all 3 local backing containers are running and healthy:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml ps
```

### Expected Output:
```text
NAME                IMAGE                               STATUS                    PORTS
kiot-emqx-dev       emqx/emqx:5.8.5                     Up (healthy)              0.0.0.0:1883, 8883, 18083...
kiot-postgres-dev   timescale/timescaledb:latest-pg16   Up (healthy)              0.0.0.0:5432->5432
kiot-redis-dev      redis:7-alpine                      Up (healthy)              0.0.0.0:6380->6379
```

---

## Smoke Test 2: Database & TimescaleDB Extension

Verify that PostgreSQL and TimescaleDB hypertables are functioning:

```bash
docker exec -it kiot-postgres-dev psql -U postgres -d kiot_dev -c "
SELECT 
  (SELECT count(*) FROM organizations) AS orgs,
  (SELECT count(*) FROM products) AS products,
  (SELECT count(*) FROM user_profiles) AS users,
  (SELECT count(*) FROM devices) AS devices,
  (SELECT count(*) FROM industrial_machines) AS machines,
  (SELECT count(*) FROM telemetry_readings) AS telemetry_points;
"
```

### Expected Output:
`orgs: 1 | products: 4 | users: 2 | devices: 2 | machines: 2 | telemetry_points >= 12`

---

## Smoke Test 3: REST API Service Health & Swagger UI

1. **Query API Health Check:**
   ```bash
   curl -s http://localhost:3000/health
   ```
   **Expected Response:** `{"status":"ok", "services":{"database":"healthy","redis":"healthy","mqtt":"healthy"}}`

2. **Verify Swagger UI in Browser:**
   - Navigate to: **`http://localhost:3000/docs`**
   - Verify that Swagger UI loads with documentation for Organizations, Devices, Machines, Commands, and Telemetry.

---

## Smoke Test 4: Multi-Tenant Security & RLS Isolation

1. **Test Missing Organization Header (Expect 400 Bad Request):**
   ```bash
   curl -s -i http://localhost:3000/v1/devices
   ```
   *Response must include:* `400 Bad Request` and code `MISSING_ORG_HEADER`.

2. **Test Unauthorized Organization Header (Expect 403 Forbidden):**
   ```bash
   curl -s -i -H "X-KIOT-Organization-Id: 11111111-1111-4111-a111-111111111111" http://localhost:3000/v1/devices
   ```
   *Response must include:* `403 Forbidden` and code `INSUFFICIENT_PERMISSIONS`.

3. **Test Authorized Organization Request (Expect 200 OK):**
   ```bash
   curl -s -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" http://localhost:3000/v1/devices
   ```
   *Response must include:* `DEV-ESP32-001` and `DEV-METER-001`.

---

## Smoke Test 5: End-to-End IoT Telemetry Ingestion Pipeline

1. **Publish Simulated Telemetry to EMQX:**
   ```bash
   pnpm --filter @kiot/device-worker exec node -e '
   import("mqtt").then(({connect}) => {
     const c = connect("mqtt://localhost:1883");
     c.on("connect", () => {
       c.publish(
         "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/telemetry",
         JSON.stringify({
           metric: "bearing_temp",
           value: 65.5,
           unit: "°C",
           productId: "industrial",
           deviceTimestamp: new Date().toISOString()
         }),
         { qos: 1 },
         () => { console.log("✓ Telemetry published"); c.end(); }
       );
     });
   });'
   ```

2. **Verify Telemetry Persisted in TimescaleDB:**
   ```bash
   docker exec -it kiot-postgres-dev psql -U postgres -d kiot_dev -c "
   SELECT time, device_id, metric, value, unit 
   FROM telemetry_readings 
   WHERE metric = 'bearing_temp' 
   ORDER BY time DESC LIMIT 1;
   "
   ```
   *Expected:* Shows `DEV-ESP32-001 | bearing_temp | 65.5 | °C`.

3. **Verify Telemetry Cached in Redis Hot Cache:**
   ```bash
   curl -s -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" \
     "http://localhost:3000/v1/telemetry/latest?device_id=DEV-ESP32-001"
   ```
   *Expected:* Returns `source: "redis_hot_cache"` with `bearing_temp = 65.5`.

---

## Smoke Test 6: Device Command Lifecycle (Dispatch $\rightarrow$ ACK)

1. **Dispatch Command via API:**
   ```bash
   curl -s -X POST \
     -H "Content-Type: application/json" \
     -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" \
     -d '{"commandType":"SET_SPEED","payload":{"rpm":3600}}' \
     http://localhost:3000/v1/devices/DEV-ESP32-001/commands
   ```
   *Expected:* Returns command with `status: "SENT"` and a generated `id`.

2. **Publish Command ACK from Edge Node:**
   *(Replace `<COMMAND_ID>` with the ID returned above)*
   ```bash
   pnpm --filter @kiot/device-worker exec node -e '
   import("mqtt").then(({connect}) => {
     const c = connect("mqtt://localhost:1883");
     c.on("connect", () => {
       c.publish(
         "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/commands/<COMMAND_ID>/ack",
         JSON.stringify({ status: "SUCCEEDED" }),
         { qos: 1 },
         () => { console.log("✓ ACK published"); c.end(); }
       );
     });
   });'
   ```

3. **Verify Command Transitioned to `SUCCEEDED`:**
   ```bash
   curl -s -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" \
     http://localhost:3000/v1/devices/DEV-ESP32-001/commands
   ```
   *Expected:* Shows `status: "SUCCEEDED"` with populated `completed_at` timestamp.

---

## Smoke Test 7: Dedicated WebSocket Gateway Verification

Execute the automated suite validating healthcheck, authentication, multi-tenant isolation, device filtering, and ping/pong:

```bash
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts
```

### Expected Output:
```text
====================================================
🧪 Starting KIOT WebSocket Gateway Verification Suite
====================================================
▶ [Test 1] Checking HTTP Health Endpoint...
  ✔ Health response: {"status":"ok","service":"websocket-gateway",...}
▶ [Test 2] Testing connection without org_id (expect rejection)...
  ✔ Connection without org_id rejected as expected
▶ [Test 3] Testing connection with invalid org_id (expect 403 rejection)...
  ✔ Unauthorized organization connection rejected as expected
▶ [Test 4 & 5] Connecting with valid tenant credentials & checking welcome event...
  ✔ WebSocket connection successfully established (101 Switching Protocols)
  ✔ Welcome payload received
▶ [Test 6] Sending device subscription request...
  ✔ Device subscription confirmed for: DEV-ESP32-001
▶ [Test 7] Publishing simulated telemetry to Redis Pub/Sub...
  ✔ Published event to Redis channel
  ✔ LIVE TELEMETRY RECEIVED VIA WEBSOCKET
▶ [Test 8] Testing Ping/Pong protocol...
  ✔ Pong received
🎉 ALL PHASE 5 WEBSOCKET VERIFICATION TESTS PASSED!
```

---

## Smoke Test 8: Full End-to-End IoT Pipeline (MQTT $\rightarrow$ Redis $\rightarrow$ WS $\rightarrow$ API)

Execute the full reactive loop simulation:

```bash
pnpm --filter @kiot/device-worker exec tsx ../../scripts/test-e2e-pipeline.ts
```

### Expected Output:
```text
===========================================================
🔄 KIOT End-to-End IoT Pipeline Verification (MQTT -> WS)
===========================================================
▶ [Step 1] Connecting real-time WebSocket client...
  ✔ WebSocket connection established for org: 00000000-0000-4000-a000-000000000001
▶ [Step 2] Simulating edge device publishing MQTT telemetry...
  ✔ Simulated edge device connected to EMQX at: mqtt://localhost:1883
  ✔ MQTT publish acknowledged by broker
▶ [Step 3] Waiting for WebSocket broadcast from Redis Pub/Sub...
  ✔ WebSocket received live forwarded telemetry: {"type":"TELEMETRY_UPDATE",...}
  ✔ Successfully captured live metric "spindle_speed_rpm" = 3200
▶ [Step 4] Verifying REST API latest telemetry cache...
  ✔ API response for latest device telemetry: source: "redis_hot_cache"
🎉 FULL END-TO-END PIPELINE VERIFICATION SUCCESSFUL!
```

---

## Smoke Test 9: Industrial Frontend Application (`apps/industrial`)

1. **Verify Development Server Running:**
   ```bash
   curl -s http://localhost:5173/ | grep -q "KIOT Industrial" && echo "✓ Frontend OK"
   ```

2. **Open Dashboard in Browser:**
   - URL: **`http://localhost:5173/`**
   - Verify UI elements:
     - Header displays active tenant: `Apex Precision Manufacturing Ltd.` with `Gateway: <1ms` live status.
     - Fleet KPI cards render: Availability `100%`, CNC-01 Spindle Speed `3,200 RPM`, Vibration RMS `3.42 mm/s`.
     - Apache ECharts dynamic streaming charts update in real time without screen tear or lag.
     - Equipment Table lists `CNC-01` (Running) and `LATHE-02` (Stopped).
     - Clicking **"Control"** opens the actuator modal permitting spindle target modulation and Emergency E-Stop.
     - Switching to **"Telemetry Scope"** displays multi-channel real-time waveforms.



