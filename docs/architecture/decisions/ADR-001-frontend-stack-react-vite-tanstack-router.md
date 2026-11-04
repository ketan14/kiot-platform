# ADR-001: Frontend Technology Stack Selection (React 19 + TypeScript + Vite + TanStack Router)

**Status:** Accepted  
**Date:** 2026-11-04  
**Deciders:** Principal Software Architect, KIOT Platform Engineering  
**Consulted:** Frontend Engineering, IoT Platform Team  
**Informed:** Product Management, Operations  

---

## 1. Context and Requirements

The KIOT Platform is a multi-tenant IoT SaaS platform designed to monitor, manage, and automate devices across multiple domains: KIOT Industrial, KIOT Cold, KIOT Home, and KIOT Energy. The platform features two core operational portals:
1. **Platform Admin Portal:** Central administrative portal for KIOT internal operators.
2. **Customer Admin Portal:** Tenant-specific portal for organization admins, plant managers, and field operators.
3. **Product Dashboards:** Domain-specific operational applications (starting with KIOT Industrial).

### Key Frontend Requirements:
- **Authenticated SaaS Architecture:** The applications are private, authenticated dashboards with zero public SEO or content marketing requirements.
- **Complex Real-Time Data & Telemetry:** Rapid rendering of high-frequency telemetry (charts, gauges, live tabular updates) driven by WebSockets.
- **Deep Nested Navigation & Filtering:** Highly parameter-driven views (e.g., site $\rightarrow$ line $\rightarrow$ machine $\rightarrow$ register with time windows and status filters).
- **Strict Multi-Tenancy & RBAC:** Dynamic tenant context switching, role-based navigation guards, and token-based API authentication.
- **Desktop Application Portability:** Clear path to packaging dashboards into native desktop applications via Tauri for on-premise industrial control rooms without web browser chrome.
- **Independent Deployability:** Each portal/dashboard must build into static bundles that can be deployed to CDNs, object storage, or embedded gateway web servers without server runtime overhead.
- **Developer Velocity & Type Safety:** End-to-end type safety across monorepo packages, API contracts, routing, and form validation.

---

## 2. Considered Alternatives

### Alternative 1: Next.js (App Router / Pages Router)
* **Description:** Full-stack React meta-framework featuring Server-Side Rendering (SSR), Server Components (RSC), and Server Actions.
* **Why Considered:** Industry popularity, built-in routing, image optimization, and full-stack capabilities.
* **Why Rejected:**
  1. *Unnecessary Server Layer:* KIOT already implements a centralized Node.js/TypeScript REST API service and dedicated IoT background workers. Introducing Next.js adds an unnecessary Node.js server layer between the browser and the API.
  2. *Incompatibility with Static/Edge Deployments:* Standard Next.js server components require a Node.js runtime or specialized serverless hosting (e.g., Vercel, AWS Amplify), complicating on-premise, CDN, or gateway-hosted distributions.
  3. *Zero SEO Value:* All KIOT dashboards reside behind authentication boundaries; server-side HTML rendering provides no search indexing benefit.
  4. *Tauri Portability Impediment:* Next.js applications relying on SSR, Server Actions, or server middleware cannot be packaged cleanly as standalone desktop apps via Tauri without running a background Node server.
  5. *Streaming & Hydration Overhead:* Real-time IoT dashboards update continuously via WebSockets; server hydration mechanics offer no performance benefit for streaming telemetry.

### Alternative 2: TanStack Start
* **Description:** Full-stack SSR framework built directly on top of TanStack Router and Nitro.
* **Why Considered:** First-class integration with TanStack Router and Query.
* **Why Deferred:** As of late 2026, TanStack Start is evolving rapidly. While promising, introducing a full-stack meta-framework when server-rendering is not required introduces framework volatility. TanStack Start remains an evaluation candidate for future public-facing web portals.

### Alternative 3: React Router v7 / Remix
* **Description:** Unified full-stack and client routing framework.
* **Why Considered:** Solid client-data and nested routing paradigm.
* **Why Rejected:** TanStack Router provides superior compile-time type safety for complex, multi-variable URL search parameters (critical for telemetry filters, pagination, and multi-tenant URL parameters) without requiring full framework lock-in.

### Alternative 4: Vite + React 19 + TanStack Router (Selected)
* **Description:** Single-Page Application (SPA) architecture built with Vite, React 19, and the TanStack ecosystem.

---

## 3. Decision

We will standardize **React 19 + TypeScript + Vite + TanStack Router** as the frontend foundation across all KIOT applications. Next.js is explicitly excluded from the initial architecture.

### Finalized Frontend Technology Stack:

| Layer | Standard Selection | Version / Scope |
|---|---|---|
| **UI Framework** | React | 19.x |
| **Language** | TypeScript | Strict Mode (`5.x+`) |
| **Build Tool** | Vite | 6.x / Latest LTS |
| **Routing** | TanStack Router | `@tanstack/react-router` (Type-safe client routing) |
| **Server State** | TanStack Query | `@tanstack/react-query` v5 |
| **Styling** | Tailwind CSS | v4.x (`@tailwindcss/vite`) |
| **Component Library** | shadcn/ui + Radix UI | Headless accessible primitives |
| **Forms** | React Hook Form | v7.x |
| **Validation** | Zod | v3.x (shared schemas) |
| **Data Tables** | TanStack Table | `@tanstack/react-table` v8 |
| **Telemetry & Charts** | Apache ECharts | `echarts` + specialized canvas wrapper |
| **Icons** | Lucide React | `lucide-react` |
| **Client State** | Zustand | v5 (used strictly for non-server, non-URL state) |
| **Unit/Component Test** | Vitest + React Testing Library | Fast Vite-native unit testing |
| **End-to-End Testing** | Playwright | Multi-browser headless automation |

---

## 4. Rationale & Advantages

1. **Architectural Purity (Separation of Concerns):**
   The browser communicates exclusively with the KIOT REST API and WebSocket Gateway. There is no intermediate "BFF" (Backend-for-Frontend) server layer to maintain, monitor, scale, or secure.
2. **Type-Safe URL Search Parameters:**
   Industrial dashboards require deep bookmarkable URLs (e.g., `/industrial/machines?site_id=10&status=running&page=1&from=2026-11-01`). TanStack Router enforces compile-time validation on query parameters via Zod schemas, eliminating runtime URL parsing bugs.
3. **Optimized for Real-Time & Live Telemetry:**
   Vite SPAs render directly on the client. Live data arriving through WebSockets directly updates TanStack Query caches or local ECharts canvas instances with zero SSR reconciliation overhead.
4. **Tauri Desktop Compatibility:**
   Because Vite produces pure static assets (`index.html`, `.js`, `.css`), the exact same frontend codebase can be compiled into a lightweight, secure native desktop binary using Tauri without code modification.
5. **Simple, Low-Cost Static Hosting:**
   Production builds can be hosted on standard S3/Cloudflare R2 buckets fronted by a CDN, or directly served by Nginx or Caddy on an industrial edge gateway during on-premise deployments.

---

## 5. Disadvantages and Mitigations

| Disadvantage | Impact | Mitigation |
|---|---|---|
| **No Server-Side Rendering (SSR)** | Initial page load time includes downloading the JavaScript bundle. | Code splitting at the route level via TanStack Router lazy imports; aggressive caching of static assets on CDN; vendor chunk splitting in Vite. |
| **Client-Side Auth Token Handling** | Auth tokens must be validated client-side on route transitions. | Implement TanStack Router `beforeLoad` route guards that verify tokens and active organization state against TanStack Query cache before rendering. |
| **Search Engine Optimization (SEO)** | Web crawlers cannot easily index dynamic content. | Not applicable. KIOT Platform Admin, Customer Admin, and Industrial dashboards are private authenticated enterprise apps. Public landing pages can use a lightweight static site generator if needed. |

---

## 6. Consequences

- **Backend Independence:** Frontend teams rely exclusively on OpenAPI specifications generated by the Node.js API service (`packages/api-client`).
- **Monorepo Simplicity:** All frontend applications share UI components (`packages/ui`), validation schemas (`packages/validation`), and typed API clients without worrying about server/client boundary constraints.
- **Security Boundaries:** Frontend applications never hold privileged Supabase service keys or unrestricted MQTT broker credentials. All privileged interactions are brokered by the REST API and authenticated WebSocket gateway.

---

## 7. Conditions for Re-evaluation

This decision may be revisited under the following circumstances:
1. **Public Marketing & Documentation Portals:** If KIOT launches a public marketing website, knowledge base, or public device documentation hub requiring public SEO, a server-rendered framework (such as Next.js or Astro) may be introduced *specifically* for that standalone web application.
2. **Evolution of TanStack Start:** If TanStack Start reaches mature enterprise stability and there is a verified business requirement for server-rendered dashboards (e.g., edge-rendered dynamic OpenGraph cards for automated report sharing), it may be evaluated as an upgrade path from TanStack Router.
3. **Severe Initial Bundle Size Constraints:** If field devices in extremely bandwidth-constrained regions experience unacceptable initial bundle download delays despite code splitting and Brotli compression.

