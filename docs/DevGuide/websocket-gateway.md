# Real-Time WebSocket Gateway

The KIOT WebSocket Gateway (`services/websocket-gateway`) is a dedicated microservice engineered for high-concurrency, low-latency push notifications to frontend dashboards.

---

## 1. Architectural Role & Separation of Concerns

```
                               ┌──► Fastify REST API (Port 3000) ──► CRUD, Queries, Commands
[ Edge Devices ] ──► [ EMQX ] ─┤
                               └──► Device Worker ──► Redis Pub/Sub ──► WebSocket Gateway (Port 3001)
                                                                                  │
                                                                                  ▼
                                                                     [ Browser Dashboards ]
```

- **Separation from REST API:** The WebSocket Gateway is intentionally decoupled from `services/api`. Long-lived persistent WebSocket connections have distinct memory, keep-alive, and event loop profiles compared to short-lived stateless HTTP/REST requests.
- **Port:** Runs by default on port **3001** (configured via `WS_PORT`).
- **Scalability:** The Gateway is stateless. Multiple gateway instances can run concurrently behind a Layer 4/Layer 7 load balancer with sticky sessions or generic reverse proxying, synchronized via the Redis Pub/Sub bus.

---

## 2. Redis Pub/Sub Backplane

The gateway does not connect directly to the MQTT broker or execute continuous database polling. Instead:

1. The **Device Ingestion Worker** (`services/device-worker`) normalizes edge MQTT messages and publishes them to Redis channels partitioned by tenant:
   ```text
   Channel: org:{organization_id}:telemetry
   ```
2. When the first client of an organization connects, the gateway dynamically subscribes to that organization's Redis channel.
3. When the last client of an organization disconnects, the gateway unsubscribes from the channel to eliminate unnecessary CPU and network utilization.

---

## 3. Client Connection Lifecycle & Protocol

### 3.1. Handshake & Authentication

Clients initiate a WebSocket handshake with the tenant context:

```text
ws://localhost:3001?org_id=00000000-0000-4000-a000-000000000001&token=user_00000000-0000-4000-b000-000000000001
```

1. **Parameter Validation:** The gateway verifies that `org_id` is supplied (either as a query parameter or `X-KIOT-Organization-Id` header). Missing org returns `400 Bad Request`.
2. **Membership Authorization:** The gateway queries `organization_memberships` in PostgreSQL to ensure the requesting user is an active member. Non-members receive `403 Forbidden`.
3. **Upgrade:** On successful verification, the HTTP connection is upgraded to WebSocket (`101 Switching Protocols`).
4. **Welcome Frame:** The gateway immediately dispatches:
   ```json
   {
     "type": "CONNECTION_ESTABLISHED",
     "organizationId": "00000000-0000-4000-a000-000000000001",
     "userId": "00000000-0000-4000-b000-000000000001",
     "role": "owner",
     "timestamp": "2026-11-04T02:50:00.068Z"
   }
   ```

---

### 3.2. Client Messaging & Device Filtering

By default, an authenticated client receives telemetry events for all devices in their organization. Clients can selectively subscribe or unsubscribe to specific devices:

#### Subscribe to Specific Device:
```json
{ "action": "subscribe_device", "deviceId": "DEV-ESP32-001" }
```
**Server Response:**
```json
{ "status": "subscribed", "deviceId": "DEV-ESP32-001" }
```

#### Unsubscribe from Device:
```json
{ "action": "unsubscribe_device", "deviceId": "DEV-ESP32-001" }
```
**Server Response:**
```json
{ "status": "unsubscribed", "deviceId": "DEV-ESP32-001" }
```

#### Client Ping:
```json
{ "action": "ping" }
```
**Server Response:**
```json
{ "action": "pong", "timestamp": "2026-11-04T02:50:00.081Z" }
```

---

### 3.3. Server Heartbeat & Zombie Detection

- The server executes a heartbeat interval every 30 seconds (`HEARTBEAT_INTERVAL_MS`).
- Sockets that fail to respond to standard WebSocket ping frames are terminated with `ws.terminate()` to prevent socket leaks.

---

## 4. Operational Commands

```bash
# Start Gateway in Development Mode
pnpm --filter @kiot/websocket-gateway dev

# Check Health Endpoint
curl http://localhost:3001/health

# Run Gateway Automated Verification Suite
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts
```

