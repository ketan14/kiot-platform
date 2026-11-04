# KIOT Platform – QA Test Matrix & Verification Checklist

> [!IMPORTANT]
> For browser-based manual testing and pre-flight environment checks, refer to the **[Mandatory Application Pre-Flight Checklist & QA Test Cases](file:///home/ketan/projects/Krisha/kiot-platform/docs/QADocs/mandatory-application-checklist.md)**.

| Test ID | Subsystem | Test Scenario | Verification Command / Method | Expected Output | Status |
|---|---|---|---|---|---|
| **INF-01** | Infrastructure | EMQX MQTT Broker Health | `docker compose -f infrastructure/docker/docker-compose.dev.yml ps` | Container is running and healthy on ports 1883, 8883, 18083. | ✅ Passed |
| **INF-02** | Infrastructure | TimescaleDB Extension | `SELECT extname FROM pg_extension WHERE extname = 'timescaledb';` | Extension `timescaledb` version 2.x loaded. | ✅ Passed |
| **INF-03** | Infrastructure | Redis Cache & Pub/Sub | `docker exec -it kiot-redis-dev redis-cli ping` | Returns `PONG` on port 6380 (mapped to 6379). | ✅ Passed |
| **MIG-01** | Database | Core Schema Migration | `pnpm db:migrate` | Tables, foreign keys, and indexes created without SQL errors. | ✅ Passed |
| **MIG-02** | Database | Timescale Hypertables | `SELECT count(*) FROM _timescaledb_catalog.hypertable;` | Hypertable `telemetry_readings` registered. | ✅ Passed |
| **MIG-03** | Database | Continuous Aggregates | `SELECT count(*) FROM timescaledb_information.continuous_aggregates;` | Materialized views `telemetry_1m_rollup` and `telemetry_1h_rollup` active. | ✅ Passed |
| **MIG-04** | Database | Data Retention Policy | `SELECT count(*) FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';` | 90-day retention job registered. | ✅ Passed |
| **SED-01** | Database | Seed Data Population | `pnpm db:seed` | Seed records present for Org, Users, Devices, Machines, and Telemetry. | ✅ Passed |
| **API-01** | REST API | Health Check | `GET http://localhost:3000/health` | `status: "ok"`, all backing services reported `healthy`. | ✅ Passed |
| **API-02** | REST API | OpenAPI / Swagger UI | `GET http://localhost:3000/docs` | Swagger documentation interface renders all endpoint schemas. | ✅ Passed |
| **SEC-01** | Security / RLS | Missing Org Header | `GET /v1/devices` (no header) | `400 Bad Request` with code `MISSING_ORG_HEADER`. | ✅ Passed |
| **SEC-02** | Security / RLS | Unauthorized Org Context | `GET /v1/devices` with invalid Org ID | `403 Forbidden` with code `INSUFFICIENT_PERMISSIONS`. | ✅ Passed |
| **SEC-03** | Security / RLS | Authorized Tenant Access | `GET /v1/devices` with valid Org ID | `200 OK`, returns only devices belonging to active organization. | ✅ Passed |
| **IOT-01** | IoT Ingestion | Shared Subscription | Device Worker startup log | Subscribes to `$share/ingestion_group/kiot/+/devices/+/telemetry`. | ✅ Passed |
| **IOT-02** | IoT Ingestion | Batch Buffer Persistence | Publish MQTT telemetry to EMQX | Worker buffers readings and flushes batch to TimescaleDB. | ✅ Passed |
| **IOT-03** | IoT Ingestion | Hot State Cache Sync | `GET /v1/telemetry/latest?device_id=...` | Returns live sensor values sub-millisecond from Redis hash. | ✅ Passed |
| **IOT-04** | IoT Ingestion | Continuous Rollup View | `GET /v1/telemetry/history?...&resolution=1m` | Returns 1-minute bucket rollups (`avg`, `min`, `max`) from TimescaleDB. | ✅ Passed |
| **SHD-01** | Device Shadow | Reported State Update | Publish to `kiot/.../devices/.../state` | Shadow delta computed, version incremented, device heartbeat refreshed. | ✅ Passed |
| **CMD-01** | Commands | Dispatch Command | `POST /v1/devices/.../commands` | Command stored in database, published to MQTT, status set to `SENT`. | ✅ Passed |
| **CMD-02** | Commands | Edge ACK Handling | Publish ACK to `kiot/.../commands/{id}/ack` | Command status transitioned from `SENT` $\rightarrow$ `SUCCEEDED`. | ✅ Passed |
| **WS-01** | WebSocket | Health Endpoint | `GET http://localhost:3001/health` | Returns `status: "ok"`, active connection count, and uptime. | ✅ Passed |
| **WS-02** | WebSocket | Tenant Auth & Upgrade | Connect `ws://localhost:3001?org_id=...` | Rejects missing/invalid org (400/403); upgrades valid tenant (101). | ✅ Passed |
| **WS-03** | WebSocket | Device Subscriptions | Send `{action: 'subscribe_device', deviceId: '...'}` | Confirms subscription and selectively filters incoming telemetry events. | ✅ Passed |
| **WS-04** | WebSocket | Ping/Pong Heartbeat | Send `{action: 'ping'}` / Heartbeat interval | Returns `pong` timestamp; prunes dead sockets every 30s. | ✅ Passed |
| **E2E-01** | Full Pipeline | MQTT $\rightarrow$ WS Live Streaming | `pnpm exec tsx scripts/test-e2e-pipeline.ts` | Complete loop from MQTT publish to live browser WS event in < 50ms. | ✅ Passed |
| **UI-01** | Frontend | Vite Dev Server & Proxy | `http://localhost:5173/` | Serves React 19 app and correctly proxies `/v1` to API & `/ws` to Gateway. | ✅ Passed |
| **UI-02** | Frontend | Apache ECharts Streaming | Live canvas oscilloscope in browser | Renders 60FPS multi-channel waves without DOM re-render spikes. | ✅ Passed |
| **UI-03** | Frontend | Remote Command Dispatch | Command Control Modal | Triggers `POST /v1/devices/:id/commands` with optimistic UI feedback. | ✅ Passed |

