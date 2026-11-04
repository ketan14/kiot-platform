# KIOT Platform – Frontend Architecture Specification

**Document Version:** 1.0  
**Date:** 2026-11-04  
**Status:** Approved Standard  
**Target Applications:** Platform Admin, Customer Admin, Industrial Dashboard, Future Product Portals  

---

## 1. Executive Summary & Design Principles

The KIOT frontend architecture is engineered to deliver high-performance, real-time industrial and IoT operational interfaces. It standardizes on a **Vite-powered Single Page Application (SPA)** model using **React 19**, **TypeScript**, and the **TanStack Ecosystem** (Router, Query, Table).

### Core Architectural Principles:
1. **Single Source of Truth for State:** URL search parameters represent shareable view state (filters, sorting, pagination); TanStack Query manages server cache; Zustand manages strictly ephemeral client state.
2. **Compile-Time Type Safety:** Complete type safety spanning API contracts (`packages/api-client`), form validation (`packages/validation`), and URL route parameters (`@tanstack/react-router`).
3. **Decoupled Backend Architecture:** The frontend communicates strictly via the central Node.js REST API and WebSocket Gateway. No intermediate BFF server layer or Next.js server runtime is introduced.
4. **Security by Isolation:** Frontend bundles run entirely in the browser context with non-privileged credentials (e.g., Supabase anon key, user JWT). No privileged database or direct broker admin credentials touch the client.
5. **Desktop Portability (Tauri-Ready):** Clean abstractions around storage, networking, and navigation ensure that any dashboard can be packaged into a native Tauri desktop app for on-premise industrial workstations.

---

## 2. Standardized Frontend Technology Stack

| Layer | Standard Selection | Version / Package | Architectural Responsibility |
|---|---|---|---|
| **Framework** | React | `^19.0.0` | Component lifecycle, UI rendering, Transitions, Suspense |
| **Language** | TypeScript | `^5.6.0` | Strict static typing, no `any`, shared contract compliance |
| **Bundler & Dev Server** | Vite | `^6.0.0` | Fast ESM HMR, optimized static asset production |
| **Routing** | TanStack Router | `@tanstack/react-router` `^1.80.0` | Type-safe file/code-based routing, nested layouts, search params validation |
| **Server State** | TanStack Query | `@tanstack/react-query` `^5.60.0` | Asynchronous state management, polling, caching, optimistic mutations |
| **Styling Engine** | Tailwind CSS | `v4.0.0` via `@tailwindcss/vite` | Modern CSS-first utility styling, design tokens, `@theme` variables |
| **UI Primitives** | shadcn/ui + Radix UI | `@radix-ui/react-*` | Accessible, headless, customizable UI components |
| **Form Management** | React Hook Form | `^7.54.0` | High-performance uncontrolled form handling with minimal re-renders |
| **Schema Validation** | Zod | `^3.24.0` | Schema definitions for forms, URL parameters, and API validation |
| **Data Tables** | TanStack Table | `@tanstack/react-table` `^8.20.0` | Headless virtualization, sorting, filtering, and column pinning |
| **Data Visualization** | Apache ECharts | `echarts` `^5.5.0` | High-frequency telemetry time-series, gauges, heatmaps, canvas rendering |
| **Iconography** | Lucide React | `lucide-react` `^0.460.0` | Clean, standardized vector icons |
| **Client State** | Zustand | `^5.0.0` | Ephemeral client UI state (sidebar toggles, modal queues, local preferences) |
| **Unit / Component Test**| Vitest + RTL | `vitest` `^2.1.0` + `@testing-library/react` | Vite-native unit and component test execution |
| **End-to-End Testing** | Playwright | `@playwright/test` `^1.49.0` | Automated headless cross-browser user journey verification |

### Dependency Compatibility Matrix Verification:
- **React 19 & Vite 6:** Fully supported via `@vitejs/plugin-react` (`^4.3.4`).
- **Tailwind CSS v4:** Uses the official `@tailwindcss/vite` plugin. Configuration moves from `tailwind.config.js` to pure CSS `@theme` definitions, eliminating compilation friction.
- **Radix UI & React 19:** Radix UI primitives have resolved React 19 peer dependencies in their latest releases.
- **TanStack Router & Query:** Both v1 and v5 natively support React 19 concurrent features, transitions, and Suspense.
- **Apache ECharts:** Integrated using a custom React 19 `useRef` + `ResizeObserver` lifecycle hook (`packages/ui/src/components/echarts-wrapper.tsx`) to avoid legacy third-party wrapper peer-dependency conflicts.

---

## 3. Removal of Next.js & Strategic Roadmap

### Why Next.js is Excluded:
1. **Zero Public SEO Requirements:** KIOT applications (Platform Admin, Customer Admin, Industrial Monitoring) are enterprise SaaS dashboards protected by strict authentication. Server-side pre-rendering provides zero search engine value.
2. **Architectural Redundancy:** KIOT already has a designated backend modular monolith (Node.js LTS REST API) and dedicated ingestion workers (Device Worker, Notification Worker). Next.js would introduce a redundant Node.js backend layer (BFF), increasing maintenance and operational complexity.
3. **Operational Overhead:** Next.js applications require complex server hosting runtimes (Node.js servers, custom Docker containers with memory overhead, or proprietary serverless environments). In contrast, Vite outputs pure static assets deployable to any edge CDN, S3 bucket, or low-power embedded industrial gateway (e.g., Moxa Linux Gateway running Nginx).
4. **Desktop Packaging Friction:** A Next.js application using Server Components and Server Actions cannot easily be compiled into a standalone Tauri desktop application.

### Future Considerations:
- **TanStack Start:** As the TanStack ecosystem stabilizes its full-stack framework (TanStack Start), it may be evaluated as a unified upgrade path for scenarios requiring edge-rendering (e.g., generating dynamic OpenGraph report preview images or server-rendered exportable reports). It will **not** be introduced into the initial release.
- **Public Portals:** If KIOT launches a public marketing website or public device documentation hub in the future, a dedicated static site generator (Astro or Next.js) may be deployed specifically for that standalone web property.

---

## 4. Frontend Applications

The standardized stack applies across all KIOT frontend applications:

1. **KIOT Platform Admin** (`apps/platform-admin`): Central operations, organization management, product catalogues, device registry, and firmware lifecycle.
2. **KIOT Customer Admin** (`apps/customer-admin`): Multi-tenant customer administration, users/roles, hierarchical sites/locations, device onboarding, and subscription management.
3. **KIOT Industrial** (`apps/industrial`): Operational dashboard for SME factories, machine running/stopped status, downtime tracking, Modbus sensor telemetry, and alerts.
4. **Future KIOT Home** (`apps/home`): Smart home automation, switches, room grouping, and scene control.
5. **Future KIOT Cold** (`apps/cold`): Cold-chain and pharmaceutical temperature monitoring, excursion alerts, and HACCP compliance reporting.
6. **Future KIOT Energy** (`apps/energy`): Facility energy monitoring, power quality, tariff calculations, and peak demand alerts.

### Architectural Rules for Applications:
- **Independent Build & Deploy:** Each application maintains its own `vite.config.ts`, route tree, Dockerfile, and static asset deployment target. An issue or deployment in one application never blocks or affects another.
- **No Premature Scaffolding:** Do **not** create empty placeholder directories or boilerplate applications for future products (`home`, `cold`, `energy`) at this stage. They will be scaffolded when their active implementation phase commences.

```
kiot-platform/
└── apps/
    ├── platform-admin/          # KIOT Internal Operator Portal (Active)
    ├── customer-admin/          # Tenant Management & Provisioning Portal (Active)
    └── industrial/              # KIOT Industrial Operational Dashboard (Active)
```

---

## 5. Routing Architecture (TanStack Router)

TanStack Router is standard across all applications. It provides compile-time type-safe routing, nested layouts, route-level data preloading, and validated URL search parameters.

### 5.1 Route Tree Hierarchy
```
__root.tsx (Root Layout, TanStack Query Client, Theme Provider, Toast/Notification Root)
├── (auth)
│   ├── login.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
└── (authenticated) (Protected Layout: Session & Active Org Validator)
    ├── _app.tsx (App Shell: Sidebar, Topbar, Org Switcher, User Menu)
    │   ├── dashboard.tsx
    │   ├── locations/
    │   │   ├── index.tsx
    │   │   └── $locationId.tsx
    │   ├── devices/
    │   │   ├── index.tsx              # URL: /devices?product=industrial&gateway_id=GW001
    │   │   └── $deviceId/
    │   │       ├── overview.tsx
    │   │       ├── telemetry.tsx       # URL: /telemetry?device_id=DEV001&from=...&to=...
    │   │       └── settings.tsx
    │   └── industrial/
    │       └── machines/
    │           ├── index.tsx          # URL: /industrial/machines?site_id=10&status=running&page=1
    │           └── $machineId.tsx
```

### 5.2 Validated URL Search Parameters (Zod Integration)
Search parameters represent the source of truth for all filters, sorting, and pagination. TanStack Router validates these parameters before the route component mounts.

#### Standard Example 1: Industrial Machine Filtering
```typescript
// apps/industrial/src/routes/(authenticated)/_app/industrial/machines/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const machineSearchSchema = z.object({
  site_id: z.coerce.number().optional(),
  status: z.enum(['running', 'stopped', 'abnormal', 'offline']).optional(),
  page: z.coerce.number().catch(1).default(1),
  limit: z.coerce.number().catch(20).default(20),
  search: z.string().optional(),
});

export type MachineSearch = z.infer<typeof machineSearchSchema>;

export const Route = createFileRoute('/(authenticated)/_app/industrial/machines/')({
  validateSearch: (search) => machineSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, context }) => {
    // Pre-populate TanStack Query cache before route transition
    return context.queryClient.ensureQueryData(
      machinesQueryOptions(deps)
    );
  },
  component: MachineListScreen,
});
```
**Shareable URL Produced:**  
`/industrial/machines?site_id=10&status=running&page=1`

#### Standard Example 2: Device Registry Lookup
```typescript
const deviceSearchSchema = z.object({
  product: z.enum(['home', 'cold', 'industrial', 'energy']).optional(),
  gateway_id: z.string().optional(),
  status: z.enum(['online', 'offline', 'provisioning']).optional(),
  page: z.coerce.number().catch(1).default(1),
});
```
**Shareable URL Produced:**  
`/devices?product=industrial&gateway_id=GW001`

#### Standard Example 3: Telemetry Range Filtering
```typescript
const telemetrySearchSchema = z.object({
  device_id: z.string().min(1),
  from: z.string().datetime().catch(() => new Date(Date.now() - 86400000).toISOString()),
  to: z.string().datetime().catch(() => new Date().toISOString()),
  metrics: z.array(z.string()).optional(),
  resolution: z.enum(['raw', '1m', '15m', '1h']).default('1m'),
});
```
**Shareable URL Produced:**  
`/telemetry?device_id=DEV001&from=2026-11-01T00:00:00Z&to=2026-11-04T00:00:00Z`

---

## 6. Authentication & Protected Routing Strategy

```
                              Route Navigation
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │  TanStack Router beforeLoad  │
                      └──────────────┬───────────────┘
                                     │
                     Is Valid Supabase Auth Session?
                                ├─── NO ───► Redirect to /login
                                │
                               YES
                                │
                    Has Valid Active Organization?
                                ├─── NO ───► Redirect to /select-organization
                                │
                               YES
                                │
                User Has Required Permissions for Route?
                                ├─── NO ───► Render 403 Forbidden Screen
                                │
                               YES
                                │
                                ▼
                       Render Route Layout
```

1. **Authentication Token Lifecycle:** Supabase Auth issues JWT access tokens and refresh tokens. The token is stored securely in browser `localStorage` (or memory with a refresh cookie) and injected into the HTTP `Authorization: Bearer <token>` header by `packages/api-client`.
2. **Active Organization Context:**
   - A user can belong to multiple organizations.
   - The active organization ID is stored in the user session and transmitted via the standard HTTP header: `X-KIOT-Organization-Id: <org_uuid>`.
   - The backend validates that the authenticated `user_id` has an active membership in that `organization_id` on every request.
3. **Route Guards via `beforeLoad`:**
   ```typescript
   export const Route = createFileRoute('/(authenticated)')({
     beforeLoad: async ({ context, location }) => {
       const session = await context.auth.getSession();
       if (!session) {
         throw redirect({
           to: '/login',
           search: { redirect: location.href },
         });
       }
       if (!context.auth.activeOrgId) {
         throw redirect({ to: '/select-organization' });
       }
     },
   });
   ```

---

## 7. API Communication & State Management

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND STATE TIERS                            │
├───────────────────┬────────────────────────────────────────────────────┤
│ Tier 1: URL State │ Search Params (Filters, Pagination, Sorting, Tabs) │
│ Tier 2: Server    │ TanStack Query (Caches API endpoints & Telemetry)  │
│ Tier 3: Client UI │ Zustand (Sidebar state, Modal queues, Local pref)  │
│ Tier 4: Theme/App │ React Context (Dark/Light mode, Localization)      │
└───────────────────┴────────────────────────────────────────────────────┘
```

### 7.1 Server State via TanStack Query
- **Single HTTP Gateway:** All business operations query the central Node.js REST API through the shared client in `packages/api-client`.
- **Query Key Factories:** Query keys are strictly typed and centralized to prevent stale cache bugs:
  ```typescript
  export const machineKeys = {
    all: ['machines'] as const,
    lists: () => [...machineKeys.all, 'list'] as const,
    list: (filters: MachineSearch) => [...machineKeys.lists(), filters] as const,
    details: () => [...machineKeys.all, 'detail'] as const,
    detail: (id: string) => [...machineKeys.details(), id] as const,
  };
  ```
- **Security Boundary:** Frontend applications **never** possess privileged Supabase service keys (`supabase_admin_key`) or direct unrestricted MQTT broker credentials. All database access is brokered through the API with PostgreSQL RLS.

### 7.2 Ephemeral Client State via Zustand
Zustand is reserved strictly for non-URL, non-server state:
- UI Shell state: Sidebar collapsed/expanded, alert notification drawer open/closed.
- Modal / Dialog manager state.
- Client-side drafting of complex multi-step forms before validation.

---

## 8. Real-time WebSocket Integration

```
Field Device / Gateway
       │ (MQTT Telemetry)
       ▼
  EMQX Broker
       │
  Device Worker
       │ (Publish Ingested Telemetry)
       ▼
 Redis Pub/Sub  (Channel: `org:{org_id}:telemetry`)
       │
 WebSocket Gateway
       │ (Authorized WSS Connection)
       ▼
KIOT Frontend (React 19)
       │
       ├──► 1. Direct ECharts Telemetry Streaming (via Canvas buffer)
       └──► 2. TanStack Query Cache Updates (`queryClient.setQueryData`)
```

### 8.1 Connection & Topic Subscription Lifecycle
- **Authentication:** The frontend connects to the WebSocket Gateway using:
  `wss://api.kiot.io/v1/ws?token=<supabase_jwt>&org_id=<active_org_uuid>`
- The WebSocket Gateway validates the JWT, verifies tenant membership, and subscribes the socket to that tenant's Redis Pub/Sub events.
- **Frontend Hook Implementation (`useTelemetrySubscription`):**
  - High-frequency metrics (e.g., voltage, power, motor RPM) bypass deep React state reconciliation. Telemetry readings are pushed directly into a ring-buffer array that feeds the Apache ECharts instance via an imperative `chart.setOption({ series: [...] })` call.
  - Low-frequency state changes (e.g., machine running status changes to `stopped` or device goes `offline`) directly invalidate or patch the TanStack Query cache:
    ```typescript
    queryClient.setQueryData(machineKeys.detail(machineId), (old) => ({
      ...old,
      status: incomingEvent.status,
    }));
    ```
- **Connection Resilience:** Built-in exponential backoff reconnection (`1s, 2s, 5s, 10s, max 30s`) with a global connectivity indicator badge (`Connected`, `Reconnecting`, `Offline`).

---

## 9. Reusable Monorepo Packages

Shared packages reside under `packages/` and are consumed across `apps/*`:

```
kiot-platform/
└── packages/
    ├── ui/                      # Design system: shadcn/ui, Radix primitives, ECharts wrapper
    ├── api-client/              # OpenAPI-generated TanStack Query hooks and fetcher
    ├── shared-types/            # Common domain types (Machines, Devices, Telemetry, Org)
    ├── validation/              # Shared Zod schemas (Auth, Devices, Commands, Search Params)
    ├── permissions/             # RBAC role definitions, permission matrix, and guards
    └── config/                  # Shared configs: TypeScript (tsconfig), ESLint, Prettier
```

### Package Responsibilities:
- **`packages/ui`:** Standardized design system. Exports Tailwind CSS v4 styling tokens, accessible Radix UI primitives, shadcn/ui components (`Button`, `Dialog`, `Dropdown`, `Input`), data presentation components (`DataTable`, `StatusBadge`), and custom industrial visualization wrappers (`TelemetryChart` utilizing Apache ECharts via an imperative canvas hook).
- **`packages/api-client`:** Fully typed HTTP client automatically generated from the backend OpenAPI 3.1 specification. Exports ready-to-use TanStack Query hooks (`useGetMachines`, `usePostDeviceCommand`, `useGetDeviceTelemetry`) pre-configured with active organization header injection and JWT authentication.
- **`packages/shared-types`:** Single source of truth for TypeScript types and interfaces representing domain models (`Machine`, `Gateway`, `Device`, `Organization`, `TelemetryReading`, `DeviceCommandState`). Prevents duplicate type definitions between backend services and frontend applications.
- **`packages/validation`:** Reusable Zod validation schemas. Used symmetrically across frontend forms (via React Hook Form's `@hookform/resolvers/zod`), TanStack Router URL search parameter validation (`validateSearch`), and backend API request validation middleware.
- **`packages/config`:** Centralized, shared configuration files across the monorepo, including `tsconfig.base.json`, shared ESLint flat configs, Prettier settings, and Tailwind CSS theme definitions.

---

## 10. Desktop Application Compatibility (Tauri)

To support future deployment on industrial control-room workstations without relying on third-party web browsers, the frontend architecture maintains strict **Tauri compatibility**:

```
┌────────────────────────────────────────────────────────┐
│                   TAURI RUNTIME SHELL                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Native Rust Shell (Windowing, Tray, Local Cache) │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │ Webview (WKWebView / WebKitGTK / WebView2) │  │  │
│  │  │                                            │  │  │
│  │  │  Loaded from: Static Vite Build (dist/)    │  │  │
│  │  │  - React 19 + TanStack Router              │  │  │
│  │  │  - Identical UI & Components               │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Architectural Rules for Desktop Compatibility:
1. **Zero Node.js Server Dependencies:** Applications build into a static bundle (`index.html`, `.js`, `.css`) with hash-based or history API client routing.
2. **Abstracted Network Layer:** API base URLs and WebSocket endpoints are read from a configurable environment provider (`window.__KIOT_CONFIG__` or `import.meta.env`).
3. **No Direct Node/Browser Native Calls:** Storage and navigation use standard Web APIs (`localStorage`, `fetch`, `WebSocket`). In Tauri, these can transparently delegate to native Rust plugins when offline caching is required.

---

## 11. Testing Strategy

```
┌────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                     │
├──────────────────────────┬─────────────────────────────┤
│ E2E Testing (Playwright) │ Critical flows (Auth,       │
│                          │ Navigation, Live Dashboard) │
├──────────────────────────┼─────────────────────────────┤
│ Component Testing (RTL)  │ Forms, Complex Tables,      │
│                          │ Modals, Role Visibility     │
├──────────────────────────┼─────────────────────────────┤
│ Unit Testing (Vitest)    │ Zod Schemas, Utils, Format, │
│                          │ Custom Hooks, Transforms    │
└──────────────────────────┴─────────────────────────────┘
```

- **Unit Testing (Vitest):** Tests pure utility functions, data transformations, calculation of metrics (kW, kWh), and Zod schema validation rules.
- **Component Testing (React Testing Library + Vitest):** Tests user interactions, form validation error rendering, and accessible modal behavior. Network interactions are mocked using **MSW (Mock Service Worker)**.
- **End-to-End Testing (Playwright):**
  - Cross-browser validation (Chromium, Firefox, WebKit).
  - Tests complete user journeys: Tenant login $\rightarrow$ Organization selection $\rightarrow$ Registering an industrial gateway $\rightarrow$ Viewing real-time simulated telemetry.

---

## 12. Build, Environment & Deployment Strategy

### 12.1 Environment Configuration
Applications consume strictly typed environment variables validated at build and runtime via `packages/validation`:
```typescript
// packages/validation/src/env.ts
import { z } from 'zod';

export const frontendEnvSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_WS_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
});
```

### 12.2 Static Asset Build & Deployment
- `pnpm --filter @kiot/industrial build` triggers `tsc -b && vite build`.
- Generates a static `/dist` directory.
- Deployed to CDN storage (Cloudflare Pages, AWS S3/CloudFront) or packaged as an Nginx static container for on-premise industrial gateways.
- Cache headers:
  - `index.html`: `Cache-Control: no-cache, no-store, must-revalidate`
  - `/assets/*`: `Cache-Control: public, max-age=31536000, immutable` (fingerprinted chunks).

