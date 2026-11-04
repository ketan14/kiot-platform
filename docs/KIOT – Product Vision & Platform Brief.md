# KIOT – Product Vision & Platform Brief

**Document Version:** 2.0  
**Date:** 4 November 2026  
**Status:** Approved Architecture Draft  
**Product:** KIOT Technologies  
**Tagline:** Connected Intelligence for the Physical World

---

# 1. Executive Summary

KIOT is a modular, multi-tenant IoT SaaS platform designed to connect, monitor, manage and automate physical devices, machines, equipment and environments.

The vision is to create a common IoT technology platform that supports multiple independent products through shared infrastructure, services, device management and security.

Instead of developing separate IoT systems for every use case, KIOT provides a unified platform on which multiple products can operate.

The initial product portfolio will include:

1. **KIOT Home** – Smart home automation.
2. **KIOT Cold** – Cold storage and temperature monitoring.
3. **KIOT Industrial** – Industrial machine and factory monitoring.
4. **KIOT Energy** – Energy monitoring and management.

All products share a common KIOT Platform while maintaining independent product functionality, user experiences and domain-specific data structures.

**Primary objectives:**

- Build a scalable IoT SaaS foundation.
- Support multiple organizations and customers with strict multi-tenancy.
- Support different device types and communication protocols (MQTT, Modbus RTU/TCP).
- Enable real-time monitoring, telemetry visualization, and alerts.
- Provide centralized device and subscription management.
- Support hardware from KIOT and third-party manufacturers.
- Build a platform that expands seamlessly from India to international markets.

---

# 2. Brand Architecture

## 2.1 Master Brand

**KIOT Technologies**  
KIOT acts as the parent technology brand.  
**Tagline:** *Connected Intelligence for the Physical World.*

## 2.2 Product Portfolio

| Product | Description | Target Customers |
|---|---|---|
| **KIOT Home** | Smart home automation and device control | Homeowners, residential customers, installers |
| **KIOT Cold** | Temperature monitoring and cold-chain management | Cold storage, pharmacies, food processing, logistics |
| **KIOT Industrial** | Machine monitoring and factory automation | Manufacturing, fabrication, engineering units |
| **KIOT Energy** | Energy monitoring and management | Factories, commercial buildings, residential societies |

Products feature independent branding under the KIOT master brand while sharing common platform infrastructure.

---

# 3. KIOT Platform – Shared Foundation

The KIOT Platform is the central technology foundation powering every product. It manages common business capabilities and technical infrastructure.

## 3.1 Platform Modules

### A. Identity and Authentication
- User registration and login.
- Email-based authentication (Supabase Auth).
- Password reset and session management.
- Multi-factor authentication (planned phase).
- User profile management.
- Multi-organization membership with active organization switcher.

### B. Organization and Tenant Management
- Organization profiles and metadata.
- Organization users and memberships.
- Multiple locations, branches, and sites.
- Tenant-specific configurations and feature toggles.
- Organization-level roles and permissions.
- Subscription association and entitlement enforcement.
- Validation of active-organization membership on every backend request.

### C. Role-Based Access Control (RBAC)
Supported initial roles:
- Platform Super Admin
- Platform Administrator
- Organization Owner
- Organization Administrator
- Manager
- Operator
- Viewer

Permissions are granularly evaluated based on product, organization, location, and resource hierarchies.

### D. Product Management
- Product catalogue and lifecycle.
- Per-tenant product activation and entitlements.
- Product-specific configuration.
- Product-to-device mapping.

### E. Subscription and Billing
- Tiered subscription plans (Monthly and Annual).
- Organization-level and product-level subscriptions.
- Enforcement of device limits, user limits, and feature flags.
- Lifecycle handling: trial, active, past-due, expired, suspended.
- Upgrade/downgrade workflows and billing provider integration.

### F. Location Management
- Hierarchical location model: Organization $\rightarrow$ Factory/Site $\rightarrow$ Building $\rightarrow$ Floor/Area $\rightarrow$ Production Line / Room.
- Device installation locations.
- Location-scoped access control.

### G. Device Registry
- Device registration and unique hardware identity (UUID / MAC).
- Secure device credentials (keys, tokens, mTLS certs).
- Device assignment and ownership mapping.
- Live connectivity status (Online, Offline, Degraded).
- Device configuration parameters and metadata.
- Firmware version tracking and last-seen telemetry timestamps.
- Device replacement, decommissioning, and factory-reset workflows.

### H. Device Communication
- High-throughput MQTT connectivity via EMQX.
- Telemetry data ingestion and validation.
- Device state synchronization (Reported vs. Desired State / Device Shadow).
- Bidirectional device commands and structured command acknowledgements.
- Device event logging, heartbeat monitoring, and automated offline detection.

### I. Firmware Management (OTA)
- Firmware release and version registry.
- Target hardware compatibility mapping.
- Over-The-Air (OTA) update scheduling and deployment.
- Rollback mechanisms and update progress tracking.

### J. Notifications
- Multi-channel delivery: Email, In-app, Webhooks, Push notifications.
- Alert acknowledgement and multi-tier escalation policies.
- Per-user notification preferences and quiet hours.

### K. Audit and Activity Logs
- Comprehensive audit trail: user actions, organization modifications, device configuration edits, command dispatch logs, subscription changes, and security events.

---

# 4. Application Architecture

KIOT implements separate frontend applications sharing a unified backend foundation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Platform Admin Portal │ Customer Admin Portal  │ Product Applications  │
│ (Internal Operations) │ (Tenant Management)    │ (Home, Cold, Ind, En) │
└───────────┬───────────┴───────────┬────────────┴───────────┬───────────┘
            │                       │                        │
            └───────────────────────┼────────────────────────┘
                                    │ REST API + WebSockets
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           KIOT PLATFORM                                │
├────────────────────────────────────────────────────────────────────────┤
│ REST API Service (Node.js LTS + TypeScript Modular Monolith)           │
│ ├─ Auth & Orgs     ├─ RBAC (Postgres RLS)    ├─ Device Registry        │
│ ├─ Subscriptions   ├─ Product Entitlements   ├─ Command Dispatch       │
└────────────────────────────────────────────────────────────────────────┘
```

## 4.1 Platform Admin Portal
Used by internal KIOT operators and administrators to manage organizations, product catalogues, subscriptions, global device registry, firmware releases, and platform health telemetry.

## 4.2 Customer Admin Portal
Used by customer administrators to manage their organization profile, users, roles, hierarchical locations, subscribed products, device onboarding, alert thresholds, and billing.

## 4.3 Product Applications
Dedicated operational experiences tailored to domain needs:
- **KIOT Home Dashboard:** Switch and room control, schedules, automation scenes.
- **KIOT Cold Dashboard:** Temperature/humidity monitoring, chamber status, HACCP reports.
- **KIOT Industrial Dashboard:** Factory overview, machine status, downtime logs, Modbus sensor readings.
- **KIOT Energy Dashboard:** Energy consumption breakdown, demand graphs, cost estimates.

---

# 5. Technical Architecture

## 5.1 Frontend Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | React 19 | Standardized component architecture |
| **Language** | TypeScript | Strict type safety across client packages |
| **Build Tool** | Vite | Fast HMR and lightweight bundle production |
| **Routing** | TanStack Router | Type-safe nested routing and search param validation |
| **Server State** | TanStack Query | Caching, deduplication, optimistic updates |
| **Styling** | Tailwind CSS v4 | Modern, utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Accessible, composable UI building blocks |
| **Forms & Validation** | React Hook Form + Zod | Controlled validation schemas |
| **Data Tables** | TanStack Table | High-performance sortable/filterable tables |
| **Charts** | Apache ECharts | Industrial-grade time-series and telemetry visualization |
| **Icons** | Lucide React | Consistent iconography |
| **Client State** | Zustand | Local/client-only state when context is insufficient |
| **Testing** | Vitest + RTL + Playwright | Unit, component, and end-to-end coverage |

*Note: Next.js is deliberately excluded for initial authenticated applications. The SPA architecture ensures direct deployment and future compatibility with Tauri desktop packaging.*

## 5.2 Backend Stack

| Layer | Technology | Details |
|---|---|---|
| **Runtime & Language** | Node.js LTS + TypeScript | High developer velocity and shared monorepo types |
| **Architecture** | Modular Monolith + Workers | Single codebase; separate decoupled runtime containers |
| **API Contract** | RESTful + OpenAPI | Machine-readable API definitions for client generation |
| **Identity & DB** | Supabase Auth + PostgreSQL | Managed auth, relational integrity, and Row-Level Security |
| **Time-Series Engine** | TimescaleDB (`pg_timeseries`) | Hypertables, automatic continuous aggregates, data retention |
| **MQTT Broker** | EMQX 5.x | Scalable IoT broker with Shared Subscriptions and Rule Engine |
| **Live Updates** | WebSocket Gateway + Redis Pub/Sub | Scalable real-time message fanout |
| **Testing** | Vitest + Testcontainers | Comprehensive unit and integration testing |

## 5.3 IoT & Hardware Stack

| Layer | Technology | Details |
|---|---|---|
| **Microcontroller** | ESP32 | Cost-effective edge node for sensing and basic control |
| **Firmware Framework** | ESP-IDF | Robust C/C++ firmware, secure boot, flash encryption |
| **Industrial Gateway** | Linux (Moxa, Advantech, Teltonika) | Ruggedized edge gateways for Modbus and protocol bridging |
| **Gateway Agent** | Node.js / TypeScript | Local buffering, Modbus polling, MQTT uplink |
| **Industrial Protocols** | Modbus RTU (RS-485) / Modbus TCP | Factory machinery and energy meter integration |
| **Northbound Transport** | MQTT over TLS (Port 8883) | Secure bidirectional telemetry and command channel |

---

# 6. Multi-Tenant Architecture & Security

KIOT enforces multi-tenancy at every layer of the stack:

```
┌────────────────────────────────────────────────────────┐
│                   TENANT ISOLATION                     │
├────────────────────────────────────────────────────────┤
│ 1. API Level: Request context derives organization_id  │
│ 2. DB Level: PostgreSQL RLS enforces org boundaries    │
│ 3. MQTT Level: Topic isolation per org                 │
│    (kiot/{org_id}/devices/{device_id}/...)             │
│ 4. Worker Level: Device-to-Org binding validation      │
└────────────────────────────────────────────────────────┘
```

1. **Row-Level Security (RLS):** Every tenant-owned table incorporates an `organization_id` column. RLS policies reject access unless the authenticated user is an authorized member of that organization.
2. **MQTT Topic ACLs:** Devices are strictly sandboxed to their own topics:
   - Telemetry: `kiot/{org_id}/devices/{device_id}/telemetry`
   - Commands: `kiot/{org_id}/devices/{device_id}/commands`
   - State Sync: `kiot/{org_id}/devices/{device_id}/state`
3. **Defense-in-Depth for Workers:** Background workers running with elevated database permissions validate device-to-organization bindings against an in-memory/cached registry before writing telemetry.

---

# 7. IoT Communication Architecture

## 7.1 Communication Flow

```
[ Edge Device / Gateway ]
          │
          │ MQTT over TLS (8883)
          ▼
    [ EMQX Broker ]
          │
          │ Shared Subscription ($share/workers/...)
          ▼
   [ Device Worker ]
          │
          ├────────────── Batch Writes (250ms) ──────────────┐
          │                                                  ▼
          │ Redis Pub/Sub                             [ PostgreSQL / TimescaleDB ]
          ▼                                                  ▲
[ WebSocket Gateway ]                                        │ Query API
          │                                                  │
          ▼ WebSocket                                        ▼
[ Web Dashboards ] ◄──────────────────────────────── [ REST API Service ]
```

## 7.2 Device Shadow (State Synchronization)
To reliably manage device states over unreliable connections, KIOT adopts the **Device Shadow** pattern:
- **Desired State:** Created by user action via REST API (e.g., Target Temp = $4^\circ\text{C}$).
- **Reported State:** Published by device when physically applied.
- **Delta Notification:** If device is offline, it receives the difference immediately upon reconnect.

## 7.3 Device Provisioning
- QR code on physical hardware containing device UUID and public identity.
- BLE provisioning protocol for initial Wi-Fi credential onboarding.
- SoftAP fallback mechanism.
- Hardware-backed secrets; no hardcoded Wi-Fi or tenant secrets stored in QR codes.

---

# 8. KIOT Product Specifications

## 8.1 KIOT Home – Smart Home Automation
- **Target:** Homeowners, apartments, residential societies, installers.
- **Features:** Relay switches, lighting/fan control, room grouping, automation routines, mobile-responsive UI.
- **Hardware:** ESP32 smart relays, environmental sensors.
- **Roadmap:** Matter protocol, Alexa/Google Assistant bridges.

## 8.2 KIOT Cold – Cold Storage Monitoring
- **Target:** Cold storage, pharmaceutical warehousing, food processing, commercial kitchens.
- **Features:** Continuous temperature/humidity logging, excursion threshold alerts, tamper-evident audit logs, automated PDF compliance reports.
- **Compliance:** HACCP-oriented audit trails, GDP-ready data retention; local audible/visual alarms operate independently of cloud connectivity.

## 8.3 KIOT Industrial – Industrial Monitoring
- **Target:** SME manufacturing, workshops, fabrication units, packaging plants.
- **Features:** Machine run/stop status detection, downtime logging, Modbus RTU/TCP sensor acquisition, energy meter aggregation, factory layout maps.
- **Protocols:** Modbus RTU (RS-485), Modbus TCP, Digital Inputs, Analog Inputs.
- **Edge Strategy:** Commercial Linux industrial gateways running KIOT Edge Agent alongside ESP32 sensor nodes.

## 8.4 KIOT Energy – Energy Monitoring
- **Target:** Factories, commercial buildings, multi-tenant facilities.
- **Features:** Real-time kW, kVA, Voltage, Current, Power Factor; tariff-based cost computation; threshold-based peak demand alerts.

---

# 9. Repository and Monorepo Structure

```
kiot-platform/
├── apps/
│   ├── platform-admin/          # Internal operations portal (React 19 + Vite)
│   ├── customer-admin/          # Tenant admin portal (React 19 + Vite)
│   └── industrial/              # KIOT Industrial dashboard (React 19 + Vite)
├── services/
│   ├── api/                     # Modular Monolith REST API (Node.js LTS + TS)
│   ├── device-worker/           # MQTT ingestion and normalization worker
│   ├── notification-worker/     # Alert evaluation and email/push worker
│   └── websocket-gateway/       # Real-time WebSocket fanout server
├── packages/
│   ├── ui/                      # Shared design system (shadcn/ui + Tailwind v4 + ECharts)
│   ├── api-client/              # Generated TanStack Query client
│   ├── shared-types/            # Shared DTOs and MQTT contracts
│   ├── validation/              # Zod schemas used across API, forms, and search params
│   ├── permissions/             # RBAC roles, permissions, and rule sets
│   ├── config/                  # Shared linting, TS, and formatting configs
│   └── logging/                 # Structured JSON logger
├── firmware/
│   └── esp32/                   # ESP-IDF C/C++ firmware projects
├── edge/
│   └── gateway-agent/           # Node.js/TypeScript industrial gateway daemon
├── supabase/
│   ├── migrations/              # SQL schema and TimescaleDB migrations
│   ├── seed/                    # Development seed data
│   └── config.toml              # Supabase CLI configuration
├── infrastructure/
│   ├── docker/                  # Docker Compose for local development (EMQX, Redis, Postgres)
│   ├── emqx/                    # EMQX configuration, ACLs, and plugins
│   ├── monitoring/              # Prometheus and Grafana dashboards
│   └── deployment/              # Production deployment manifests
├── docs/                        # Architectural documentation and guides
│   ├── architecture/            # High-level architecture, frontend specs, decisions (ADRs)
│   ├── database/                # Database schemas and Timescale retention policies
│   ├── iot/                     # MQTT topic schemas and device provisioning
│   └── industrial/              # Modbus mapping and industrial protocols
├── scripts/                     # Developer tooling and automation scripts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

# 10. Development Roadmap

| Phase | Title | Key Deliverables |
|---|---|---|
| **Phase 1** | Foundation | Monorepo setup, Docker Compose (EMQX, Postgres, Redis), Supabase migrations, shared TS packages. |
| **Phase 2** | Identity & Multi-Tenancy | Supabase Auth, Organization management, Membership, Roles & Permissions, RLS policies. |
| **Phase 3** | Admin Portals | Customer Admin & Platform Admin layouts, product catalogue, device registry UI. |
| **Phase 4** | IoT Core | EMQX broker setup, Device Worker ingestion, Device Shadow state management, shared subscriptions. |
| **Phase 5** | Telemetry & Real-Time | TimescaleDB hypertable setup, WebSocket gateway, live dashboard charts, threshold alerts. |
| **Phase 6** | KIOT Industrial MVP | Machine run/stop tracking, Modbus RTU/TCP gateway agent, factory overview dashboard. |
| **Phase 7** | Pilot & Hardening | Physical hardware validation, offline buffer testing, security audit, customer pilot deployment. |
| **Phase 8** | Product Expansion | KIOT Home, KIOT Cold, KIOT Energy specialized applications. |

---

# 11. Initial Proof of Concept (PoC)

**Objective:** Complete an end-to-end device-to-dashboard workflow.

1. **Hardware / Simulator:** ESP32 board or Modbus simulator generating sensor values.
2. **Ingestion:** ESP32 publishes MQTT telemetry over TLS to local EMQX broker.
3. **Processing:** Device Worker ingests payload via EMQX shared subscription, validates device token, and writes batch record to PostgreSQL / TimescaleDB.
4. **Fanout:** Device Worker pushes event to Redis Pub/Sub; WebSocket Gateway transmits reading to connected browser.
5. **UI Display:** React Industrial Dashboard displays live temperature chart and updates connection badge without manual page reload.

---

# 12. Architectural Governance & Reference Documents

For detailed subsystem specifications and architectural decisions, refer to:
- **High-Level System Architecture:** [high-level-architecture.md](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/high-level-architecture.md)
- **Frontend Architecture Specification:** [frontend-architecture.md](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/frontend-architecture.md)
- **Architecture Decision Records (ADR):**
  - [ADR-001: Frontend Technology Stack Selection (React 19 + Vite + TanStack Router)](file:///home/ketan/projects/Krisha/kiot-platform/docs/architecture/decisions/ADR-001-frontend-stack-react-vite-tanstack-router.md)
