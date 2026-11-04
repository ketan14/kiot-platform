# KIOT Platform (`kiot-platform`)

> **Connected Intelligence for the Physical World**

KIOT is an industrial-grade, multi-tenant IoT SaaS platform designed to connect, monitor, manage, and automate physical devices, machines, and environments across multiple products: **KIOT Industrial**, **KIOT Cold**, **KIOT Home**, and **KIOT Energy**.

---

## 🏗 System & Architecture Documentation

For complete technical specifications, guidelines, and architectural decisions:

1. **[KIOT Product Vision & Platform Brief](file:///home/ketan/projects/Krisha/kiot-platform/docs/KIOT%20%E2%80%93%20Product%20Vision%20&%20Platform%20Brief.md)**  
   *The primary product brief, domain specifications, roadmap, and foundational platform requirements.*
2. **[High-Level System Architecture](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/high-level-architecture.md)**  
   *Control plane vs. data plane topology, EMQX MQTT ingestion, TimescaleDB time-series storage, WebSocket push, and multi-tenant security.*
3. **[Frontend Architecture Specification](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/frontend-architecture.md)**  
   *Standardized frontend stack (React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS v4, shadcn/ui, ECharts), routing patterns, URL state management, and Tauri compatibility.*
4. **[ADR-001: Frontend Technology Stack Selection](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/decisions/ADR-001-frontend-stack-react-vite-tanstack-router.md)**  
   *Architecture Decision Record documenting the selection of React 19 + Vite + TanStack Router and the deliberate exclusion of Next.js for initial authenticated dashboards.*
5. **[Developer Guide (`docs/DevGuide/`)](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/getting-started.md)**  
   *Prerequisites, monorepo packages, Fastify REST API, TimescaleDB, and IoT Device Worker ingestion pipeline.*
6. **[User & Operator Guide (`docs/UserGuide/`)](file:///home/ketan/projects/Krisha/kiot-platform/docs/UserGuide/overview.md)**  
   *Product lines, multi-tenant hierarchy, device onboarding, device shadow sync, and factory machine monitoring.*
7. **[QA & Testing Documentation (`docs/QADocs/`)](file:///home/ketan/projects/Krisha/kiot-platform/docs/QADocs/smoke-tests.md)**  
   *Testing pyramid, step-by-step smoke testing procedures, and 20-point verification test matrix.*

---

## 💻 Standardized Frontend Stack

| Layer | Standard Selection |
|---|---|
| **UI Framework** | React 19 (`react`, `react-dom`) |
| **Language** | TypeScript (Strict Mode) |
| **Build Tool** | Vite |
| **Routing** | TanStack Router (`@tanstack/react-router`) |
| **Server State** | TanStack Query (`@tanstack/react-query`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **UI Components** | shadcn/ui + Radix UI Primitives |
| **Forms & Validation** | React Hook Form + Zod |
| **Data Tables** | TanStack Table (`@tanstack/react-table`) |
| **Visualizations** | Apache ECharts |
| **Icons** | Lucide React |
| **Client State** | Zustand (ephemeral client-only UI state) |
| **Testing** | Vitest + React Testing Library + Playwright |

---

## 📂 Monorepo Structure

```
kiot-platform/
├── apps/                               # Web applications (Vite SPAs)
│   ├── platform-admin/                 # Internal KIOT operator portal
│   ├── customer-admin/                 # Tenant customer admin portal
│   └── industrial/                     # KIOT Industrial operational dashboard
├── services/                           # Backend services & background daemons
│   ├── api/                            # Modular Monolith REST API (Node.js LTS)
│   ├── device-worker/                  # MQTT ingestion & normalization daemon
│   ├── notification-worker/            # Alert evaluation & notification dispatch
│   └── websocket-gateway/              # Authorized real-time WebSocket push gateway
├── packages/                           # Shared internal packages
│   ├── ui/                             # Design system & ECharts wrapper
│   ├── api-client/                     # Typed TanStack Query client generated from OpenAPI
│   ├── shared-types/                   # Domain entities, DTOs, and MQTT contracts
│   ├── validation/                     # Shared Zod validation schemas
│   ├── permissions/                    # RBAC role definitions and permission matrices
│   ├── config/                         # Standard tsconfig, eslint, and prettier configs
│   └── logging/                        # Structured JSON logger
├── firmware/                           # Embedded firmware (ESP-IDF / C++)
├── edge/                               # Industrial gateway agent (Node.js/TS daemon)
├── supabase/                           # Database migrations & seed data
├── infrastructure/                     # Docker Compose, EMQX, and deployment configs
└── docs/                               # Architecture, IoT, database, and system docs
```

---

## 🚀 Quickstart & Local Development

### 1. Launch Backing Services (Docker Compose)
```bash
pnpm docker:up
```
Starts TimescaleDB (PostgreSQL 16), Redis 7 (port 6380), and EMQX 5.8 MQTT broker (port 1883).

### 2. Apply Database Migrations & Seed Demo Data
```bash
pnpm db:migrate
pnpm db:seed
```

### 3. Start Backend Services
In separate terminal panes (or run concurrently via Turborepo):
```bash
# Fastify REST API & Swagger UI (http://localhost:3000/docs)
pnpm dev:api

# Dedicated Real-Time WebSocket Gateway (ws://localhost:3001)
pnpm dev:ws

# High-Throughput IoT Ingestion Worker (EMQX Shared Subscriptions -> TimescaleDB)
pnpm dev:worker
```

### 4. Start Industrial Dashboard (React 19 + Vite)
```bash
pnpm dev:industrial
```
Navigate to **`http://localhost:5173/`** to view the live dashboard.

### 5. Stream Simulated Industrial Telemetry
```bash
pnpm sim:telemetry
```
Streams continuous sine-wave CNC spindle RPM, radial vibration RMS, and bearing temperature to EMQX and down to the live canvas charts over WebSocket.

---

## 🧪 Verification & Automated Suites
```bash
# Monorepo TypeScript check
pnpm check-types

# Phase 5: WebSocket Gateway Verification Suite
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts

# Full End-to-End Pipeline (MQTT -> Ingest -> TimescaleDB/Redis -> WS -> API)
pnpm --filter @kiot/device-worker exec tsx ../../scripts/test-e2e-pipeline.ts
```

