# KIOT Platform – High-Level System Architecture

**Document Version:** 1.0  
**Date:** 2026-11-04  
**Status:** Approved Standard  
**Architecture Style:** Modular Monolith (Control Plane) + Event-Driven Ingestion Workers (Data Plane)

---

## 1. System Overview & Architectural Topology

The KIOT Platform is an industrial-grade, multi-tenant IoT SaaS platform designed to support multiple independent commercial domains (**KIOT Industrial**, **KIOT Cold**, **KIOT Home**, and **KIOT Energy**) on a shared technical foundation.

The platform architecture is strictly bifurcated into two planes:
1. **Control Plane (Management & Business Logic):** A modular monolith Node.js LTS REST API handling authentication, organization hierarchy, role-based access control, billing, device registration, and firmware lifecycle.
2. **Data Plane (IoT Ingestion & Real-Time Telemetry):** An event-driven, high-throughput pipeline utilizing EMQX (MQTT broker), decoupled background workers (Device Worker), TimescaleDB time-series persistence, and a Redis Pub/Sub backplane powering a WebSocket Gateway.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          KIOT HIGH-LEVEL TOPOLOGY                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

     [ Browser / Mobile / Desktop (Tauri) ]                 [ Field Gateways & Edge Nodes ]
                        │                                                   │
                        │ HTTPS (REST API)                                  │ MQTT over TLS (Port 8883)
                        ▼                                                   ▼
            ┌──────────────────────┐                             ┌──────────────────────┐
            │   KIOT REST API      │                             │     EMQX Broker      │
            │   (Node.js LTS)      │                             │   (MQTT 5.0 Cluster) │
            └───────────┬──────────┘                             └──────────┬───────────┘
                        │                                                   │
                        │ SQL Queries / RLS                                 │ Shared Subscription ($share/...)
                        ▼                                                   ▼
            ┌──────────────────────┐        Batch Inserts        ┌──────────────────────┐
            │ Supabase PostgreSQL  │◄────────────────────────────┤    Device Worker     │
            │  (Relational Core)   │                             │  (Ingest & Validate) │
            └───────────┬──────────┘                             └──────────┬───────────┘
                        │                                                   │
                        │ Hypertables                                       │ Redis Pub/Sub
                        ▼                                                   ▼
            ┌──────────────────────┐                             ┌──────────────────────┐
            │     TimescaleDB      │                             │  WebSocket Gateway   │
            │  (Telemetry Storage) │                             │   (Realtime Push)    │
            └──────────────────────┘                             └──────────┬───────────┘
                                                                            │
                                  Authorized Real-Time WebSocket Push       │
                                  ◄─────────────────────────────────────────┘
```

---

## 2. Complete Technology Stack Standard

| Functional Domain | Technology / Tool | Version / Standard | Architectural Role |
|---|---|---|---|
| **Frontend Framework** | React | `^19.0.0` | Declarative UI rendering, Concurrent features, Transitions |
| **Frontend Language** | TypeScript | `^5.6.0` (Strict) | Monorepo-wide type safety and contract enforcement |
| **Frontend Bundler** | Vite | `^6.0.0` | Ultra-fast HMR and optimized static asset generation |
| **Client Routing** | TanStack Router | `@tanstack/react-router` `^1.80` | Compile-time type-safe routing, nested layouts, validated URL search params |
| **Server State** | TanStack Query | `@tanstack/react-query` `^5.60` | Client caching, automatic background revalidation, optimistic mutations |
| **CSS & Design Tokens** | Tailwind CSS | `v4.0.0` | CSS-first configuration via `@tailwindcss/vite`, `@theme` variables |
| **Component Primitives**| shadcn/ui + Radix UI | Headless accessible | Unstyled, accessible UI foundation |
| **Data Visualization** | Apache ECharts | `^5.5.0` | High-frequency telemetry time-series, charts, gauges, heatmaps |
| **Backend Runtime** | Node.js LTS | `v22.x LTS` | Modular Monolith REST API and background workers |
| **Backend Framework** | Fastify / Express (TS) | Fastify / REST | High-performance, schema-driven REST API with OpenAPI generator |
| **Relational Database** | PostgreSQL via Supabase| `PostgreSQL 16+` | Multi-tenant relational schema enforced by Row-Level Security (RLS) |
| **Time-Series Engine** | TimescaleDB | `pg_timeseries` extension | Hypertables, continuous aggregate rollups, retention policies |
| **Auth & Identity** | Supabase Auth | GoTrue JWT | Secure user identity, password resets, session management |
| **MQTT Broker** | EMQX | `v5.8+` | MQTT 5.0 broker, TLS termination, ACL enforcement, Shared Subscriptions |
| **Real-Time Backplane** | Redis | `v7.x` | In-memory Pub/Sub for WebSocket fanout and device latest-state cache |
| **Edge Hardware** | ESP32 + Linux Gateways | ESP-IDF / Debian Linux | Edge sensors, Modbus RTU/TCP bridges, local buffering |
| **Monorepo Manager** | pnpm + Turborepo | pnpm 9+, Turbo 2+ | Multi-package workspace coordination and remote build cache |

---

## 3. Monorepo Directory Structure & Workspace Architecture

The project is structured as a unified monorepo powered by **pnpm workspaces** and **Turborepo**:

```
kiot-platform/
├── apps/                               # User-facing applications (Vite SPAs)
│   ├── platform-admin/                 # Internal KIOT super-admin & operations portal
│   ├── customer-admin/                 # Multi-tenant customer & organization management
│   └── industrial/                     # KIOT Industrial operational monitoring dashboard
├── services/                           # Backend services & background daemons
│   ├── api/                            # Central Modular Monolith REST API (Node.js LTS)
│   ├── device-worker/                  # MQTT telemetry ingestion & normalization daemon
│   ├── notification-worker/            # Alert rule evaluation & notification dispatch
│   └── websocket-gateway/              # Authorized real-time WebSocket fanout server
├── packages/                           # Shared internal libraries & contracts
│   ├── ui/                             # Design system (shadcn/ui, Radix, Tailwind v4, ECharts wrapper)
│   ├── api-client/                     # Typed TanStack Query hooks generated from OpenAPI
│   ├── shared-types/                   # Domain entities, DTOs, MQTT telemetry contracts
│   ├── validation/                     # Shared Zod validation schemas (API, forms, search params)
│   ├── permissions/                    # RBAC roles, permission matrix, and evaluation helpers
│   ├── config/                         # Standard tsconfig, eslint, prettier, tailwind configs
│   └── logging/                        # Structured JSON application logger
├── firmware/                           # Embedded C/C++ firmware
│   └── esp32/                          # ESP-IDF firmware projects for KIOT edge nodes
├── edge/                               # Edge gateway software
│   └── gateway-agent/                  # Node.js/TypeScript Modbus bridge & buffer daemon
├── supabase/                           # Database configuration
│   ├── migrations/                     # Versioned SQL migrations (RLS, tables, Timescale)
│   ├── seed/                           # Development seed scripts
│   └── config.toml                     # Supabase local environment configuration
├── infrastructure/                     # Infrastructure-as-Code & orchestration
│   ├── docker/                         # Docker Compose stacks (EMQX, Postgres, Redis, Mosquitto)
│   ├── emqx/                           # EMQX ACLs, authentication rules, and config
│   ├── monitoring/                     # Prometheus scraping rules and Grafana dashboards
│   └── deployment/                     # Helm charts, K8s manifests, and static CDN configs
├── docs/                               # Comprehensive system documentation
│   ├── architecture/                   # High-level architecture, frontend specs, decisions (ADRs)
│   ├── database/                       # ER diagrams, RLS security models, Timescale policies
│   ├── iot/                            # MQTT topics, payloads, provisioning protocols
│   └── industrial/                     # Modbus register maps, gateway connectivity guides
├── package.json                        # Root package manifest & global dev scripts
├── pnpm-workspace.yaml                 # pnpm workspace definition
├── turbo.json                          # Turborepo task pipeline & cache definitions
└── README.md
```

### Shared Package Responsibilities:
- **`packages/ui`:** Standardized component library. Exports headless primitives, theme tokens, and industrial-specific visual components (gauges, line-charts, connection status indicators). Built to be framework-agnostic enough to run in browser SPAs or Tauri webviews.
- **`packages/api-client`:** Generated directly from the API service's OpenAPI 3.1 specification. Eliminates manual fetch calls by exporting type-safe TanStack Query hooks and mutation functions.
- **`packages/shared-types`:** Single source of truth for TypeScript types representing domain models (`Machine`, `Gateway`, `Device`, `Organization`, `TelemetryReading`, `DeviceCommand`).
- **`packages/validation`:** Zod schemas used symmetrically across both the frontend forms and the backend request validation middleware.
- **`packages/permissions`:** Central definition of roles (`super_admin`, `org_admin`, `manager`, `operator`, `viewer`) and fine-grained resource permissions (`devices:read`, `commands:write`, `billing:manage`).
- **`packages/config`:** Shared monorepo configuration packages, including base TypeScript configurations (`tsconfig`), ESLint configs, Prettier rules, and shared build tooling.

---

## 4. API Integration & Multi-Tenant Context Architecture

### 4.1 Request Pipeline & Multi-Tenant Headers
Every REST request from a frontend application traverses standard authentication and tenant verification filters:

```
[ Frontend Request ]
  │
  ├── Headers:
  │     Authorization: Bearer <supabase_jwt>
  │     X-KIOT-Organization-Id: <active_org_uuid>
  ▼
[ KIOT REST API ]
  │
  ├─ 1. Verify JWT signature via Supabase Auth public keys
  ├─ 2. Extract user_id and active org_id from request headers
  ├─ 3. Query organization_memberships table:
  │      Validate that user_id has an ACTIVE membership in active_org_id
  ├─ 4. Attach tenant context to request: req.ctx = { userId, orgId, role, permissions }
  ├─ 5. Set PostgreSQL Session variables for RLS:
  │      SET LOCAL app.current_user_id = '...';
  │      SET LOCAL app.current_org_id = '...';
  ▼
[ Route Handler / Database Transaction ]
```

### 4.2 Error Handling & API Contract Standards
- All endpoints produce uniform error payloads adhering to RFC 7807 (Problem Details):
  ```json
  {
    "type": "https://api.kiot.io/errors/insufficient-permissions",
    "title": "Forbidden",
    "status": 403,
    "detail": "User lacks 'commands:write' permission in this organization",
    "instance": "/v1/devices/DEV-001/commands",
    "code": "INSUFFICIENT_PERMISSIONS"
  }
  ```

---

## 5. IoT Ingestion & Real-Time Push Architecture

### 5.1 MQTT Ingestion Pipeline (EMQX $\rightarrow$ Device Worker)
1. **Device Connection:** Edge devices connect to EMQX over port 8883 (MQTT over TLS).
2. **Authentication:** EMQX verifies device credentials against PostgreSQL or via an HTTP webhook to the internal API auth service.
3. **Strict Topic Namespaces:**
   - Telemetry: `kiot/{org_id}/devices/{device_id}/telemetry`
   - State Sync: `kiot/{org_id}/devices/{device_id}/state`
   - Commands: `kiot/{org_id}/devices/{device_id}/commands`
   - Command Ack: `kiot/{org_id}/devices/{device_id}/commands/{command_id}/ack`
4. **Shared Subscription Ingestion:** Device Workers subscribe via:
   `$share/ingestion_group/kiot/+/devices/+/telemetry`
   EMQX automatically distributes messages across available Device Worker instances.

### 5.2 Device Worker Batching & Persistence
- To prevent database write bottlenecks, the Device Worker buffers readings in memory and executes bulk inserts:
  - **Batch Threshold:** 500 records or 250 milliseconds, whichever occurs first.
  - **Destination:** Written to TimescaleDB `telemetry_readings` hypertable.
  - **Latest State:** Upserted into a high-speed Redis hash (`device:{device_id}:latest`) to support instant dashboard lookups without scanning time-series tables.

### 5.3 Real-Time WebSocket Fanout
- When telemetry is ingested, the Device Worker publishes a lightweight event to Redis Pub/Sub: `org:{org_id}:telemetry`.
- The **WebSocket Gateway** receives the Redis event and fans it out to connected client sockets authenticated to that specific `organization_id`.
- Frontend dashboards receive live telemetry within sub-100ms latency.

---

## 6. Device Shadow & Command Lifecycle

To manage device control over unreliable industrial networks, KIOT implements the **Device Shadow (Desired vs. Reported State)** pattern:

```
[ User Action on Dashboard ]
          │
          │ POST /v1/devices/{id}/commands (Desired State: { relay_1: "ON" })
          ▼
   [ KIOT REST API ] ──► Stores Desired State in DB (Status: PENDING)
          │
          │ Publishes MQTT Command (QoS 1)
          ▼
    [ EMQX Broker ] ──► Topic: kiot/{org}/devices/{id}/commands
          │
          ▼
   [ Edge Device ]
          │ 1. Applies physical relay switch
          │ 2. Publishes ACK ──► Topic: kiot/{org}/devices/{id}/commands/{cmd_id}/ack
          │ 3. Publishes Reported State ──► Topic: kiot/{org}/devices/{id}/state
          ▼
   [ Device Worker ] ──► Marks Command SUCCEEDED in DB; updates Reported State
```

If a device is offline when a command is issued:
- The command remains `PENDING` with an expiration TTL.
- Upon reconnect, the device queries its Shadow document and synchronizes pending desired state deltas.

---

## 7. Testing Strategy

| Level | Tooling | Focus / Target |
|---|---|---|
| **Unit Testing** | Vitest | Zod schemas, domain calculation rules (kWh, OEE), utility functions |
| **Component Testing** | React Testing Library + Vitest | UI component accessibility, forms, table sorting, role-based component hiding |
| **Integration Testing**| Vitest + Testcontainers | REST API routes with live PostgreSQL (RLS verification), Redis Pub/Sub verification |
| **Worker Testing** | Vitest + Embedded MQTT | Ingestion batching, message deduplication, out-of-order timestamp handling |
| **E2E Testing** | Playwright | Full browser user journeys (Login $\rightarrow$ Org Select $\rightarrow$ Dashboard $\rightarrow$ Command execution) |
| **Edge Simulation** | Node.js Modbus simulator | Simulates 50+ Modbus slaves generating fluctuating temperature/energy readings |

---

## 8. Development Environment Setup

### 8.1 Prerequisites
- **Operating System:** Linux / Ubuntu 24.04 LTS or Windows 11 via WSL2.
- **Node.js:** `v22.x LTS` (managed via `nvm` or `fnm`).
- **Package Manager:** `pnpm` (`v9.x+`).
- **Containers:** Docker Engine & Docker Compose.
- **CLI Tools:** Supabase CLI, Turborepo CLI (`turbo`).

### 8.2 Local Stack Orchestration
A single command brings up the local backing services via Docker Compose:
```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
```
Backing services provisioned:
- **EMQX 5.x:** Local MQTT broker with Web Dashboard at `http://localhost:18083`.
- **PostgreSQL 16 + TimescaleDB:** Local database running at port `54322`.
- **Redis 7.x:** Local cache and Pub/Sub running at port `6379`.
- **Modbus Simulator:** Local TCP simulator generating machine telemetry.

---

## 9. Build, CI/CD & Deployment Architecture

### 9.1 Build Pipeline (Turborepo)
Turborepo orchestrates the build dependency graph across packages and applications:
- `turbo run check-types`: Validates TypeScript strict mode across all apps and packages.
- `turbo run test`: Executes Vitest suites with cached test results.
- `turbo run build`: Compiles Vite static assets and transpile backend services.

### 9.2 Deployment Topologies
1. **Frontend Applications (`apps/*`):**
   - Built into static assets (`dist/`).
   - Hosted on CDN edge networks (Cloudflare Pages, AWS S3 + CloudFront).
   - Also packagable as standalone Nginx containers for on-premise industrial gateway deployment.
2. **Backend Services (`services/*`):**
   - Packaged as lightweight container images (`node:22-alpine`).
   - Deployed to managed container environments (Kubernetes, AWS ECS, or Fly.io).
   - Services scale independently based on load:
     - `services/api`: Scales on HTTP request concurrency and CPU.
     - `services/device-worker`: Scales based on EMQX MQTT message queue depth.
     - `services/websocket-gateway`: Scales based on open client connection count.

