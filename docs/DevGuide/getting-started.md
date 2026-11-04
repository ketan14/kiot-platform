# KIOT Platform – Developer Guide (`DevGuide`)

Welcome to the KIOT Platform Developer Guide. This guide covers everything needed to set up, build, test, and contribute to the platform.

---

## 1. Prerequisites

Ensure your workstation has the following installed:

- **Operating System:** Linux (Ubuntu 22.04 / 24.04 recommended) or Windows 11 with WSL2.
- **Node.js:** `v22.x LTS` (tested on Node `22.23.x`).
- **Package Manager:** `pnpm` (`v12.x+`).
- **Containers:** Docker Engine & Docker Compose (`v2.x+`).
- **Build Tooling:** Turborepo CLI (`turbo`), TypeScript 5.6+.

To verify prerequisites:
```bash
node -v
pnpm -v
docker --version
docker compose version
```

---

## 2. Initial Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:kiot-technologies/kiot-platform.git
   cd kiot-platform
   ```

2. **Environment Configuration:**
   Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
   *The default configuration connects to the local Docker containers (`localhost:5432` for Postgres, `localhost:6380` for Redis, `localhost:1883` for EMQX MQTT).*

3. **Install Workspace Dependencies:**
   ```bash
   pnpm install
   ```

---

## 3. Starting Local Backing Services (Docker)

The platform requires three local backing services:
- **EMQX 5.x:** Distributed MQTT 5.0 broker.
- **PostgreSQL 16 + TimescaleDB:** Relational database with time-series hypertable support.
- **Redis 7.x:** In-memory hot state cache and Pub/Sub message bus.

Start the services with the provided script:
```bash
# Start all backing services in background
pnpm docker:up
# (or ./scripts/start-docker.sh)

# View streaming logs
pnpm docker:logs

# Stop services when done
pnpm docker:down
```

### Accessing Service Dashboards:
- **EMQX Web Dashboard:** `http://localhost:18083` (User: `admin`, Pass: `kiotadmin123`)
- **PostgreSQL / TimescaleDB:** `localhost:5432` (User: `postgres`, Pass: `postgres`, DB: `kiot_dev`)
- **Redis:** `localhost:6380` (mapped to container port 6379)

---

## 4. Database Migrations & Seeding

The database schema and development seeds are managed via SQL scripts in `supabase/`:

```bash
# Apply pending migrations
pnpm db:migrate

# Seed development data (test org, devices, machines, historical telemetry)
pnpm db:seed

# Complete reset and re-seed (drops public schema and re-applies everything)
pnpm db:reset
```

---

## 5. Running Platform Services

You can run individual services or all services concurrently:

```bash
# Run both REST API and Device Worker concurrently via Turborepo
pnpm dev

# Run only the REST API service (http://localhost:3000)
pnpm dev:api

# Run only the IoT Device Ingestion Worker
pnpm dev:worker

# Run the WebSocket Gateway (ws://localhost:3001)
pnpm dev:ws

# Run the Industrial Frontend Application (http://localhost:5173)
pnpm dev:industrial

# Run the Virtual Edge Device Simulator (Interactive Fleet)
pnpm sim:device
```

### Key URLs:
- **Frontend Dashboard:** `http://localhost:5173/`
- **API Base URL:** `http://localhost:3000`
- **Swagger UI Interactive Documentation:** `http://localhost:3000/docs`
- **WebSocket Gateway:** `ws://localhost:3001`
- **Health Check Endpoint:** `http://localhost:3000/health`

---

## 6. Code Quality & Type Checking

Turborepo coordinates build and lint tasks across all monorepo packages:

```bash
# Typecheck all packages and services
pnpm check-types

# Lint all code
pnpm lint

# Build all packages and services
pnpm build

# Automated QA Pre-Flight Suite
pnpm qa:check
```

---

## 7. Additional Developer Documentation

- [Local Database Inspection & Management Guide](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/database-access.md)
- [Monorepo & Shared Packages Architecture](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/monorepo-and-packages.md)
- [`pnpm --filter` Guide for Testing & Execution](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/pnpm-filter-guide.md)
- [REST API & Database Integration Guide](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/api-and-database.md)
- [IoT Device Ingestion Worker Pipeline](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/iot-ingestion-worker.md)
- [Real-Time WebSocket Gateway](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/websocket-gateway.md)
- [Virtual Edge Device Simulator](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/device-simulator.md)
- [Automated Alerting & Incident Management Engine](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/alert-rules-and-incidents.md)
- [Historical Telemetry & TimescaleDB Continuous Aggregates](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/historical-telemetry-and-aggregates.md)
- [Frontend Application (`apps/industrial`)](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/frontend-application.md)

