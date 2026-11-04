# Monorepo & Shared Packages Architecture

The KIOT Platform uses a unified monorepo powered by **pnpm workspaces** and **Turborepo** (`turbo`).

---

## 1. Directory Structure

```
kiot-platform/
├── apps/                               # Frontend applications (React 19 + Vite SPAs)
│   ├── platform-admin/                 # Internal KIOT super-admin & operations portal
│   ├── customer-admin/                 # Multi-tenant customer administration portal
│   └── industrial/                     # KIOT Industrial operational dashboard
├── services/                           # Backend services & daemons
│   ├── api/                            # Central Modular Monolith REST API (Fastify)
│   ├── device-worker/                  # MQTT telemetry ingestion & batch persistence daemon
│   └── websocket-gateway/              # Real-time WebSocket fanout server
├── packages/                           # Shared internal libraries and contracts
│   ├── ui/                             # Standardized design system (shadcn/ui + Tailwind v4)
│   ├── api-client/                     # Typed TanStack Query client generated from OpenAPI
│   ├── shared-types/                   # Domain entities, DTOs, and MQTT message contracts
│   ├── validation/                     # Shared Zod validation schemas
│   ├── permissions/                    # RBAC role definitions and permission matrices
│   └── config/                         # Base tsconfig, eslint, and prettier settings
├── supabase/                           # Database migrations and seed scripts
├── infrastructure/                     # Docker Compose and deployment configurations
├── scripts/                            # Automation shell scripts
├── pnpm-workspace.yaml                 # Workspace package boundaries
├── turbo.json                          # Turborepo task pipeline
└── .npmrc                              # pnpm configuration
```

---

## 2. Shared Packages Overview

Shared packages in `packages/` ensure that type definitions, validation schemas, and configurations are never duplicated across frontend and backend services.

### `@kiot/config`
Contains baseline configuration shared across all workspaces:
- `tsconfig.base.json`: Base TypeScript 5.6+ strict mode configuration.
- `tsconfig.node.json`: Configuration for Node.js LTS backend services (`services/api`, `services/device-worker`).
- `tsconfig.react.json`: Configuration for React 19 web applications and UI packages.

### `@kiot/shared-types`
Single source of truth for domain models and data transfer objects:
- `Organization`, `OrganizationMembership`, `Role`: Tenant identities.
- `ProductType`: `'industrial' | 'cold' | 'home' | 'energy'`.
- `Device`, `Gateway`, `DeviceStatus`: Edge device metadata.
- `TelemetryReading`, `TelemetryBatchPayload`: Telemetry data shapes.
- `DeviceCommand`, `DeviceShadowState`: State synchronization interfaces.
- `IndustrialMachine`: Machine operational tracking entities.

### `@kiot/validation`
Shared Zod schemas used symmetrically across frontend forms, URL search parameters, and backend API validation:
- `loginSchema`, `resetPasswordSchema`: Authentication input validation.
- `machineSearchSchema`, `deviceSearchSchema`, `telemetrySearchSchema`: TanStack Router validated URL search parameters.
- `telemetryReadingSchema`, `telemetryBatchSchema`: MQTT payload validation.
- `createCommandSchema`, `commandAckSchema`: Command creation and edge acknowledgement validation.

### `@kiot/permissions`
RBAC permissions and evaluation helpers:
- Roles: `owner`, `admin`, `manager`, `operator`, `viewer`.
- Granular permissions: `org:read`, `devices:create`, `commands:write`, `telemetry:read`, etc.
- Helper function `hasPermission(role, permission): boolean`.

---

## 3. Adding Dependencies

When adding packages, always follow pnpm workspace conventions:

### To add an external package to a specific workspace:
```bash
# Add a dependency to services/api
pnpm --filter @kiot/api add <package-name>

# Add a dev dependency to packages/validation
pnpm --filter @kiot/validation add -D <package-name>
```

### To consume an internal shared package:
Specify `"workspace:*"` in the consuming `package.json`:
```json
{
  "dependencies": {
    "@kiot/shared-types": "workspace:*",
    "@kiot/validation": "workspace:*"
  }
}
```
Then run `pnpm install` to link the packages automatically.

---

## 4. Targeted Execution with `pnpm --filter`

For detailed guidance, syntax patterns, and testing examples, see the dedicated **[`pnpm --filter` Testing & Execution Guide](file:///home/ketan/projects/Krisha/kiot-platform/docs/DevGuide/pnpm-filter-guide.md)**.

### Quick Reference:
```bash
# Run a script defined in a package's package.json
pnpm --filter <package-name> <script>

# Execute a binary (e.g. tsx, vitest) using that package's local node_modules
pnpm --filter <package-name> exec <binary> <script-path>

# Run type-checking for a single project
pnpm --filter @kiot/industrial-app check-types

# Run integration tests against a specific service
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts
```


