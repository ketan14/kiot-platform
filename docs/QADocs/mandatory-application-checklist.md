# Mandatory Application Pre-Flight Checklist & QA Test Cases

> **Target Environment:** Local Workstation (`http://localhost:5173/`)  
> **Document Purpose:** Every QA engineer, test automator, and developer **must** verify this checklist before executing browser-based testing, feature acceptance, or release qualification.

---

## ⚡ Instant One-Line QA Pre-Flight Suite

Run the automated pre-flight script from repository root to validate all 14 mandatory checks in 3 seconds:

```bash
pnpm qa:check
# Or directly: ./scripts/qa-checks.sh
```

### Expected Output:
```text
==================================================================
🧪 KIOT PLATFORM – QA PRE-FLIGHT VERIFICATION SUITE
==================================================================
▶ [1/6] Checking Host Tooling & Environments...
  ✔ [PASS] Node.js installed (v22.23.4)
  ✔ [PASS] pnpm installed (v12.16.1)
  ✔ [PASS] Docker engine running & accessible
▶ [2/6] Checking Backing Docker Containers...
  ✔ [PASS] PostgreSQL + TimescaleDB container running (Status: healthy, Port: 5432)
  ✔ [PASS] Redis container running (Status: healthy, Host Port: 6380)
  ✔ [PASS] EMQX MQTT 5.0 broker running (Status: healthy, Ports: 1883, 8883, 18083)
▶ [3/6] Checking Database Migrations & Seed Data...
  ✔ [PASS] TimescaleDB hypertable 'telemetry_readings' active
  ✔ [PASS] Demo Seed Data Present (Org: Apex Precision, Machines: 2, Devices: 2)
▶ [4/6] Checking Backend Microservices...
  ✔ [PASS] REST API Service healthy (http://localhost:3000/health)
  ✔ [PASS] OpenAPI Swagger UI interactive docs accessible (http://localhost:3000/docs)
  ✔ [PASS] WebSocket Gateway healthy (ws://localhost:3001, Active Clients: 3)
▶ [5/6] Checking Frontend Development Application...
  ✔ [PASS] Vite Frontend Application running (http://localhost:5173/)
  ✔ [PASS] Frontend Vite Reverse Proxy to Backend API working (/v1/machines)
▶ [6/6] Checking Real-Time Telemetry Pipeline & Cache...
  ✔ [PASS] Live Telemetry Hot Cache populated in Redis
==================================================================
📊 QA VERIFICATION SUMMARY REPORT
==================================================================
  • Total Checks Evaluated: 14
  • Passed Checks:          14
  • Warnings:               0
  • Failures:               0
🎉 ALL MANDATORY QA CHECKS PASSED! Ready for Browser Testing.
   👉 Open Dashboard: http://localhost:5173/
```

---

## 1. Quick Verification Matrix

| Test Case ID | Test Category | Target Subsystem | Mandatory Condition / Command | Expected Pass Criteria | Status |
|---|---|---|---|---|---|
| **PRE-01** | Infrastructure | Docker Backing Services | `pnpm docker:up` | Containers `kiot-postgres-dev`, `kiot-redis-dev`, `kiot-emqx-dev` are `healthy`. | Required |
| **PRE-02** | Database | Schema & Seed Data | `pnpm db:migrate && pnpm db:seed` | Tables, hypertables, and Apex Precision demo records exist in database. | Required |
| **PRE-03** | Backend API | Fastify REST API | `pnpm dev:api` (Port 3000) | `GET http://localhost:3000/health` returns `status: "ok"`. | Required |
| **PRE-04** | Real-Time Push | WebSocket Gateway | `pnpm dev:ws` (Port 3001) | `GET http://localhost:3001/health` returns `status: "ok"`. | Required |
| **PRE-05** | Data Plane | IoT Ingestion Worker | `pnpm dev:worker` | Subscribed to EMQX `$share/ingestion_group/...`. | Required |
| **PRE-06** | Frontend SPA | Vite Dev Server | `pnpm dev:industrial` (Port 5173) | `http://localhost:5173/` serves React 19 app with 200 OK. | Required |
| **PRE-07** | Sensor Simulator | Factory Physics Streamer | `pnpm sim:telemetry` | Publishes 1 packet/sec (RPM, vibration, temp) to EMQX. | Recommended |

---

## 2. Infrastructure Pre-Flight Test Cases

### TC-PRE-01: Docker Backing Services Health
- **Precondition:** Docker daemon is running.
- **Action:** Run `docker compose -f infrastructure/docker/docker-compose.dev.yml ps`
- **Expected Results:**
  - `kiot-postgres-dev` is `Up (healthy)` on host port `5432`.
  - `kiot-redis-dev` is `Up (healthy)` on host port `6380`.
  - `kiot-emqx-dev` is `Up (healthy)` on host ports `1883`, `8883`, `18083`.
- **Failure Action:** If any container is stopped, run `pnpm docker:up`.

### TC-PRE-02: Database Schema & Seed Verification
- **Precondition:** PostgreSQL container is healthy.
- **Action:** Run database row-count check:
  ```bash
  docker exec -it kiot-postgres-dev psql -U postgres -d kiot_dev -c "
  SELECT 
    (SELECT count(*) FROM organizations) AS orgs,
    (SELECT count(*) FROM devices) AS devices,
    (SELECT count(*) FROM industrial_machines) AS machines;
  "
  ```
- **Expected Results:** `orgs >= 1`, `devices >= 2`, `machines >= 2`.
- **Failure Action:** Run `pnpm db:reset` to re-apply migrations and seed data.

### TC-PRE-03: REST API Service Health
- **Precondition:** Database and Redis containers running.
- **Action:** Execute HTTP GET request:
  ```bash
  curl -s http://localhost:3000/health
  ```
- **Expected Results:** Response contains:
  ```json
  {"status":"ok","services":{"database":"healthy","redis":"healthy","mqtt":"healthy"}}
  ```
- **Interactive Swagger Docs:** Open `http://localhost:3000/docs` in browser to ensure OpenAPI 3.1 interface loads.

### TC-PRE-04: WebSocket Gateway Health & Auth Handshake
- **Precondition:** Redis container running on port 6380.
- **Action 1 (Health):** `curl -s http://localhost:3001/health` $\rightarrow$ Expect `{"status":"ok", "service":"websocket-gateway"}`.
- **Action 2 (Auth Rejection):** Attempt connection without `org_id`: `wscat -c "ws://localhost:3001"` $\rightarrow$ Expect `400 Bad Request`.
- **Action 3 (Tenant Upgrade):** Connect with demo tenant: `wscat -c "ws://localhost:3001?org_id=00000000-0000-4000-a000-000000000001"` $\rightarrow$ Expect `101 Switching Protocols` and welcome payload.

### TC-PRE-05: Automated End-to-End Pipeline Smoke Test
- **Action:** Run the automated end-to-end pipeline verification:
  ```bash
  pnpm --filter @kiot/device-worker exec tsx ../../scripts/test-e2e-pipeline.ts
  ```
- **Expected Results:** Exits with code 0:
  ```text
  ✔ WebSocket connection established
  ✔ Simulated edge device connected to EMQX
  ✔ MQTT publish acknowledged by broker
  ✔ WebSocket received live forwarded telemetry: {"type":"TELEMETRY_UPDATE",...}
  ✔ API response for latest device telemetry: source: "redis_hot_cache"
  🎉 FULL END-TO-END PIPELINE VERIFICATION SUCCESSFUL!
  ```

---

## 3. Browser-Based Manual Application Test Cases

Open **`http://localhost:5173/`** in Google Chrome, Chromium, or Firefox.

### TC-APP-01: Shell Layout & Multi-Tenant Header
- **Objective:** Verify active tenant context, user role, and real-time connectivity pill.
- **Test Steps:**
  1. Open `http://localhost:5173/`
  2. Observe top header navigation bar.
- **Pass Criteria:**
  - [ ] Active Tenant displays: **`Apex Precision Manufacturing Ltd.`**
  - [ ] Facility badge displays: **`Pune Plant 01`**
  - [ ] Gateway connection pill displays: **`Gateway: <1ms`** with green pulsating dot.
  - [ ] Real-time bus label indicates: **`Pub/Sub`**.
  - [ ] User avatar shows `AP` with label `Admin User` and role `OWNER`.
  - [ ] Left sidebar displays brand `KIOT PRO (Industrial IIoT)`.

### TC-APP-02: Executive Fleet Overview & Live Dynamic KPI Cards
- **Objective:** Verify plant floor KPIs update dynamically as telemetry packets arrive.
- **Test Steps:**
  1. Ensure simulator is running: `pnpm sim:telemetry`.
  2. Navigate to **"Fleet Overview"** tab (default view).
  3. Observe the four KPI summary cards.
- **Pass Criteria:**
  - [ ] **Fleet Availability:** Displays `100%` (2/2 operational units).
  - [ ] **CNC-01 Spindle Speed:** Displays real-time numeric value fluctuating smoothly around `~3,200 RPM`.
  - [ ] **Spindle Vibration (RMS):** Displays real-time value around `~3.4 mm/s` with subtext `ISO 10816: Class A`.
  - [ ] **Bearing Core Temp:** Displays real-time value around `~58.2 °C` with subtext `Alarm: 75.0 °C`.

### TC-APP-03: Real-Time Apache ECharts Oscilloscope Waveforms
- **Objective:** Verify high-frequency 60FPS canvas streaming charts update smoothly without lag.
- **Test Steps:**
  1. Observe the two dynamic charts on the Overview page:
     - *CNC-01 Spindle Dynamic Velocity (RPM)*
     - *CNC-01 Radial Vibration Velocity (RMS, mm/s)*
  2. Watch the chart canvas for 10-15 seconds.
- **Pass Criteria:**
  - [ ] Charts append new time-series data points from right to left every second.
  - [ ] Gradient area fills underneath curves transition cleanly.
  - [ ] Flashing live indicator dots (yellow / cyan) pulse on each arriving packet.
  - [ ] Hovering over the graph opens a dark tooltip showing exact timestamp and metric value.
  - [ ] Vibration chart displays the dashed red **`ISO Alarm: 4.5 mm/s`** threshold line.
  - [ ] Browser developer console shows **zero** re-render warnings or errors.

### TC-APP-04: Factory Machines Fleet Table
- **Objective:** Verify relational equipment records match TimescaleDB / Redis hot cache.
- **Test Steps:**
  1. Navigate to **"CNC & Machines"** tab in the sidebar.
  2. Inspect the equipment table.
- **Pass Criteria:**
  - [ ] Row 1 shows `CNC Milling Machine 01` (Code: `CNC-01`, Category: `MILLING`).
  - [ ] Row 1 status badge shows green glowing LED: **`RUNNING / MILLING`**.
  - [ ] Row 1 live metrics show active Spindle RPM, Vibration RMS, and Temperature.
  - [ ] Row 2 shows `Precision Lathe Machine 02` (Code: `LATHE-02`, Category: `LATHE`).
  - [ ] Row 2 status badge shows slate pill: **`STOPPED`**.
  - [ ] Total runtime column shows running hours (e.g. `142.5 hrs`).
  - [ ] Search input correctly filters equipment by name or machine code in real time.

### TC-APP-05: Remote Actuator Control & Emergency Stop (E-Stop)
- **Objective:** Verify command dispatch over REST API and live audit logging.
- **Test Steps:**
  1. In the Machines table, click the **"Control"** button on `CNC-01`.
  2. In the modal, drag the **Spindle Speed Target** slider to `3600 RPM` and click **"Apply RPM"**.
  3. Toggle the **Coolant Pump** button.
  4. Click the red **"E-STOP"** button.
- **Pass Criteria:**
  - [ ] Green success notification toast appears confirming command dispatch.
  - [ ] Recent edge dispatches audit table updates with command rows: `SET_SPEED`, `SET_RELAY`, `EMERGENCY_STOP`.
  - [ ] Command status pills display `SUCCEEDED` or `SENT`.
  - [ ] Clicking "Close Panel" returns cleanly to the equipment view.

### TC-APP-06: Dedicated Multi-Channel Telemetry Oscilloscope
- **Objective:** Verify multi-device and multi-metric scope functionality.
- **Test Steps:**
  1. Click **"Telemetry Scope"** in the sidebar.
  2. Toggle device selector between `DEV-ESP32-001` and `DEV-METER-001`.
  3. Click **"Inject Telemetry Sample"** button.
- **Pass Criteria:**
  - [ ] Four oscilloscope channels render: Spindle Speed (RPM), Radial Vibration (mm/s), Bearing Temp (°C), and Active Power (kW).
  - [ ] Min, Average, and Peak statistical summary ribbons recalculate automatically.
  - [ ] Clicking "Inject Telemetry Sample" causes an immediate burst animation on all active graphs.

---

## 4. Resilience & Error Handling Test Cases

### TC-RES-01: WebSocket Connection Loss & Automatic Reconnect
- **Test Steps:**
  1. Open dashboard in browser (`http://localhost:5173/`).
  2. Kill the WebSocket Gateway task in terminal: `pnpm --filter @kiot/websocket-gateway dev` stopped.
  3. Observe header connection badge.
  4. Restart the WebSocket Gateway.
- **Pass Criteria:**
  - [ ] Badge transitions to yellow `CONNECTING` or red `OFFLINE`.
  - [ ] Browser console initiates exponential backoff reconnect attempts (1s, 2s, 4s).
  - [ ] As soon as Gateway restarts, badge automatically transitions back to green `Gateway: <1ms` without requiring a browser page refresh.

---

## 5. Pre-Flight Execution Command Reference

```bash
# 1. Start Backing Containers
pnpm docker:up

# 2. Database Migration & Seed
pnpm db:migrate && pnpm db:seed

# 3. Start Backend Services (in separate terminal tabs or background daemons)
pnpm dev:api        # Port 3000
pnpm dev:ws         # Port 3001
pnpm dev:worker     # Shared MQTT Ingestion

# 4. Start Industrial Dashboard
pnpm dev:industrial # Port 5173

# 5. Start Live Sensor Wave Simulator
pnpm sim:telemetry
```

