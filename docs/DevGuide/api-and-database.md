# REST API & Database Integration Guide

The KIOT REST API (`services/api`) is a Fastify-based modular monolith that provides a secure, schema-validated control plane for the platform.

---

## 1. REST API Architecture

```
Client (Browser / Curl)
       │
       │ HTTP Request
       │ Headers:
       │   Authorization: Bearer <token>
       │   X-KIOT-Organization-Id: <org_uuid>
       ▼
[ Fastify Server (Port 3000) ]
       │
       ├─► 1. CORS & Helmet Security Plugins
       ├─► 2. Swagger / OpenAPI 3.1 Plugin (/docs)
       ├─► 3. requireTenantContext Hook
       │      • Validates X-KIOT-Organization-Id header
       │      • Verifies user membership in organization
       │      • Attaches req.tenant = { userId, organizationId, role }
       ▼
[ Route Handler ]
       │
       ├─► withTenantClient(userId, orgId, async (client) => { ... })
       │      • BEGIN Transaction
       │      • SELECT set_config('app.current_user_id', userId, true);
       │      • SELECT set_config('app.current_org_id', orgId, true);
       │      • Executes query with Row-Level Security enforced
       │      • COMMIT / ROLLBACK
       ▼
[ PostgreSQL / TimescaleDB ]
```

---

## 2. Multi-Tenant Request Handling

Every tenant-specific API request **must** provide the active organization context via header:

```http
X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001
```

### Authentication Token Handling:
- The API accepts JWT tokens via the `Authorization: Bearer <token>` header.
- In local development mode, omitting the token or providing a standard bearer token defaults to the seeded administrator user (`00000000-0000-4000-b000-000000000001`).

### Error Responses:
- **Missing Header (400 Bad Request):**
  ```json
  {
    "statusCode": 400,
    "error": "Bad Request",
    "code": "MISSING_ORG_HEADER",
    "message": "Header \"X-KIOT-Organization-Id\" is required for this operation."
  }
  ```
- **Unauthorized Organization (403 Forbidden):**
  ```json
  {
    "statusCode": 403,
    "error": "Forbidden",
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not belong to or is not active in this organization."
  }
  ```

---

## 3. Database Schema & RLS

### Relational Tables:
- `organizations`: Tenant metadata.
- `user_profiles`: User details.
- `organization_memberships`: User-to-organization RBAC assignment (`owner`, `admin`, `manager`, `operator`, `viewer`).
- `products`: Product lines (`industrial`, `cold`, `home`, `energy`).
- `locations`: Hierarchical sites (`site` $\rightarrow$ `building` $\rightarrow$ `line`).
- `gateways`: Edge protocol bridges.
- `devices`: Physical devices and sensors.
- `device_shadows`: Digital twin storing desired and reported JSON state.
- `device_commands`: Control commands dispatched to devices.
- `industrial_machines`: Physical machines (CNC, Lathes) with operating status and runtime hours.

### TimescaleDB Time-Series Engine:
- `telemetry_readings`: Hypertable partitioned in 7-day chunks.
- `telemetry_1m_rollup`: Continuous aggregate materialized view with 1-minute time buckets (`avg`, `min`, `max`, `count`).
- `telemetry_1h_rollup`: Continuous aggregate view with 1-hour time buckets.
- **Retention Policy:** Automatically drops raw telemetry older than 90 days.

---

## 4. Querying Telemetry via API

### Hot-State Telemetry (Redis):
To get the latest sensor readings with sub-millisecond response time:
```http
GET /v1/telemetry/latest?device_id=DEV-ESP32-001
```
Reads directly from Redis hash key `device:{id}:latest`.

### Historical Telemetry (TimescaleDB Rollups):
To query aggregated time-series data for dashboard charts:
```http
GET /v1/telemetry/history?device_id=DEV-ESP32-001&metric=temperature&resolution=1m&limit=100
```
Queries the continuous aggregate view `telemetry_1m_rollup`.

