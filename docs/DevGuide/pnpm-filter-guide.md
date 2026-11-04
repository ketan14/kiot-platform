# Developer Guide: Mastering `pnpm --filter` for Development & Testing

In a monorepo containing multiple frontend applications, backend services, and shared libraries, you rarely want to run commands across all projects at the same time.

`pnpm --filter` (short alias: `pnpm -F`) is the core mechanism to **target a specific package or a subset of packages from the repository root**, eliminating the need to manually `cd` across directories.

---

## 1. Why `pnpm --filter` Exists

In a single-package project:
```bash
npm run test
```
works because there is only one `package.json` in the current directory.

In a monorepo like **KIOT Platform**, we have 8+ projects:
- `apps/industrial` (`@kiot/industrial-app`)
- `services/api` (`@kiot/api`)
- `services/device-worker` (`@kiot/device-worker`)
- `services/websocket-gateway` (`@kiot/websocket-gateway`)
- `packages/shared-types` (`@kiot/shared-types`)
- `packages/validation` (`@kiot/validation`)
- `packages/permissions` (`@kiot/permissions`)
- `packages/config` (`@kiot/config`)

Without `--filter`, running `pnpm test` or `pnpm dev` from the root would either run everything simultaneously or fail because dependencies only exist in isolated sub-packages.

Using `--filter` allows you to **stay at the monorepo root** while executing commands inside any sub-project.

---

## 2. Command Anatomy

```bash
pnpm --filter <package_selector> <command> [arguments...]
```

| Element | Description | Example |
|---|---|---|
| `pnpm --filter` | The filter flag (or `-F`) | `pnpm --filter` |
| `<package_selector>` | The package name (`name` in `package.json`) or directory path | `@kiot/api` or `./services/api` |
| `<command>` | A script from `package.json`, an install command, or `exec` | `test`, `dev`, `build`, `add`, `exec` |
| `[arguments...]` | Optional parameters passed to the script or binary | `--watch`, `path/to/test.ts` |

---

## 3. Core Testing Use Cases

### 3.1. Running Unit / Integration Tests for One Package
Run the test runner (e.g. Vitest, Jest, Mocha) defined in that package's `scripts`:

```bash
# Run tests inside services/api
pnpm --filter @kiot/api test

# Run tests in watch mode
pnpm --filter @kiot/api test --watch

# Run tests inside packages/validation
pnpm --filter @kiot/validation test
```

---

### 3.2. Executing Standalone Test Scripts with `exec`
Often in integration and smoke testing, we write standalone TypeScript test scripts in `scripts/` (e.g. `scripts/verify-websocket.ts` or `scripts/test-e2e-pipeline.ts`).

Because root `node_modules` might not have `tsx` or `ws` or `mqtt` installed directly, we use `pnpm --filter <pkg> exec <binary>` to **borrow the execution environment and installed binaries** of that package:

```bash
# Run the WebSocket verification suite using the 'tsx' binary inside websocket-gateway
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts

# Run the full end-to-end IoT pipeline test using the 'tsx' and 'mqtt' modules in device-worker
pnpm --filter @kiot/device-worker exec tsx ../../scripts/test-e2e-pipeline.ts

# Run a custom node one-liner with the dependencies of device-worker
pnpm --filter @kiot/device-worker exec node -e 'console.log("Testing environment")'
```

> [!TIP]
> **Why `exec` is powerful:** `exec` looks up binaries in that package's local `node_modules/.bin` and resolves modules against that package's local dependencies, while still executing from the monorepo root.

---

### 3.3. Typechecking a Single Package
When you modify a file and want instant TypeScript compiler feedback without checking the entire monorepo:

```bash
# Typecheck only the industrial frontend
pnpm --filter @kiot/industrial-app check-types

# Typecheck only the device ingestion worker
pnpm --filter @kiot/device-worker check-types

# Typecheck only shared types
pnpm --filter @kiot/shared-types check-types
```

---

## 4. Advanced Selector Patterns

The `<package_selector>` is not limited to exact package names. You can target packages by directory or dependency relationships:

### 4.1. Directory Path Pattern
If you prefer directory paths over package names:
```bash
# Run test in services/api by relative folder path
pnpm --filter ./services/api test

# Target all services using a wildcard
pnpm --filter "./services/*" test
```

### 4.2. Dependency Graph Selectors (`...`)

#### A. Build a package AND its dependencies first (`<pkg>...`)
If `@kiot/api` depends on `@kiot/shared-types` and `@kiot/validation`:
```bash
# Builds @kiot/shared-types, @kiot/validation, and then @kiot/api in topological order
pnpm --filter @kiot/api... build
```

#### B. Test a package AND everything that depends on it (`...<pkg>`)
If you modify `@kiot/shared-types` and want to verify that nothing breaks across all consuming services:
```bash
# Runs test in @kiot/shared-types AND every app/service that imports it
pnpm --filter ...@kiot/shared-types test
```

#### C. Exclude a package (`!<pkg>`)
```bash
# Test all packages except the frontend app
pnpm --filter "!@kiot/industrial-app" test
```

---

## 5. `pnpm --filter` vs `cd <dir>` vs `turbo`

| Strategy | When to Use | Advantages |
|---|---|---|
| **`pnpm --filter <pkg>`** | Targeted testing, running single dev servers, running one-off scripts with `exec`, adding dependencies. | Clean root execution, no directory switching, scriptable in root `package.json`. |
| **`turbo run <task>`** | Whole-repo builds, full-suite CI test checks, monorepo typechecking. | Automatic topological ordering, caching (instant replay on cache hits), parallel execution. |
| **`cd <dir>`** | Infrequently needed in monorepos. | Prone to broken relative paths, requires switching terminals or directories. |

---

## 6. Monorepo Cheat Sheet: Common Commands

```bash
# --- Development Servers ---
pnpm --filter @kiot/api dev               # Start REST API (Port 3000)
pnpm --filter @kiot/websocket-gateway dev # Start WebSocket Gateway (Port 3001)
pnpm --filter @kiot/device-worker dev     # Start IoT Ingestion Worker
pnpm --filter @kiot/industrial-app dev    # Start Industrial UI (Port 5173)

# --- Testing & Verification ---
pnpm --filter @kiot/api test              # Run API test suite
pnpm --filter @kiot/websocket-gateway exec tsx ../../scripts/verify-websocket.ts # WS Test Suite
pnpm --filter @kiot/device-worker exec tsx ../../scripts/test-e2e-pipeline.ts    # E2E Test Suite

# --- Dependency Management ---
pnpm --filter @kiot/api add ioredis       # Add package to services/api
pnpm --filter @kiot/industrial-app add -D @types/react # Add dev dependency
```

