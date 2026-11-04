# Frontend Application (`apps/industrial`)

The KIOT Industrial Application is a real-time, desktop-ready Single Page Application (SPA) built for shop floor operators, plant managers, and maintenance engineers.

---

## 1. Architectural Stack

Per [ADR-001](../architecture/decisions/ADR-001-frontend-stack-react-vite-tanstack-router.md), the frontend strictly avoids Next.js server-side overhead for authenticated enterprise dashboards:

- **Framework:** React 19 + TypeScript + Vite 6
- **Real-Time Data Plane:** Dedicated WebSocket hook (`useRealtimeTelemetry`) with exponential backoff reconnect and sub-50ms Redis Pub/Sub backplane delivery.
- **Charts:** Apache ECharts (`echarts` + `echarts-for-react`) providing 60FPS canvas streaming without DOM tree bloat.
- **State Partitioning:**
  - **Server State:** TanStack Query v5 (caching machines, devices, command audit logs).
  - **Client & Live State:** Zustand (`useOrgStore`, `useTelemetryStore`) maintaining high-frequency ring buffers (capped at 80 points per channel) for smooth oscilloscopes.
- **Styling:** Tailwind CSS v4 with dark industrial aesthetic, glassmorphic panels, and color-coded LED indicators.

---

## 2. Directory Structure

```
apps/industrial/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── api/
    │   ├── client.ts             # Typed fetch attaching X-KIOT-Organization-Id
    │   ├── types.ts              # Data contracts matching backend REST API
    │   ├── machines.ts           # useMachines(), useMachine()
    │   ├── devices.ts            # useDevices(), useDeviceLatestTelemetry()
    │   └── commands.ts           # useDeviceCommands(), useSendCommand()
    ├── stores/
    │   ├── orgStore.ts           # Multi-tenant organization & user context
    │   └── telemetryStore.ts     # Ring buffer & WebSocket connection telemetry
    ├── hooks/
    │   └── useRealtimeTelemetry.ts # Reactive WebSocket connection lifecycle
    ├── components/
    │   ├── Layout/
    │   │   ├── Sidebar.tsx       # Navigation drawer & live status footer
    │   │   └── Header.tsx        # Tenant switcher & WebSocket latency badge
    │   ├── Overview/
    │   │   ├── MetricCard.tsx    # Glassmorphic KPI summary card
    │   │   └── MachineStatusBadge.tsx # Glowing LED status indicator
    │   ├── Machines/
    │   │   └── MachinesTable.tsx # Equipment grid with live metrics & actions
    │   ├── Telemetry/
    │   │   └── LiveStreamingChart.tsx # High-frequency Apache ECharts canvas
    │   └── Commands/
    │       └── CommandControlModal.tsx # Interactive actuators & emergency E-stop
    └── views/
        ├── OverviewView.tsx      # Executive plant overview
        ├── ScopeView.tsx         # Multi-channel oscilloscope
        └── CommandsView.tsx      # Actuator control & command dispatch logs
```

---

## 3. Development Commands

```bash
# Start Industrial App dev server (Port 5173)
pnpm --filter @kiot/industrial-app dev

# Run TypeScript check
pnpm --filter @kiot/industrial-app check-types

# Production Vite build
pnpm --filter @kiot/industrial-app exec vite build

# Run Live Telemetry Simulator (streams realistic sensor waves to EMQX)
pnpm sim:telemetry
```

---

## 4. Reverse Proxy Configuration

In `vite.config.ts`, Vite proxies `/v1` to Fastify REST API (`http://localhost:3000`) and `/ws` to WebSocket Gateway (`ws://localhost:3001`), eliminating CORS configuration in local development.

