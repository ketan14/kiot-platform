# KIOT Platform – Testing Strategy & Quality Assurance

This document defines the quality assurance standards, test automation pyramid, and verification criteria for the KIOT Platform.

---

## 1. Testing Pyramid

```
       ┌───────────────────────────────┐
       │   End-to-End Tests (E2E)      │  Playwright (Multi-browser user journeys)
       ├───────────────────────────────┤
       │   Integration & API Tests     │  Vitest + Docker / Supertest (Live DB & Redis)
       ├───────────────────────────────┤
       │   Component Tests             │  React Testing Library + Vitest
       ├───────────────────────────────┤
       │   Unit Tests                  │  Vitest (Zod schemas, transforms, metrics)
       └───────────────────────────────┘
```

### Layer Breakdown:
- **Unit Testing (Vitest):** Tests pure utility functions, Zod schema validation rules, metric unit conversions (kW $\leftrightarrow$ kWh, Celsius $\leftrightarrow$ Fahrenheit), and permission checks (`hasPermission`).
- **Component Testing (React Testing Library):** Tests frontend components in isolation: form validation errors, accessible dialogs, sortable data tables, and role-based button visibility.
- **Integration Testing:** Tests API routes against live PostgreSQL and Redis containers, verifying Row-Level Security (RLS) enforcement and database transactions.
- **Worker & Ingestion Testing:** Simulates high-rate MQTT traffic against EMQX to verify buffer batching, duplicate deduplication, and TimescaleDB hypertable persistence.
- **End-to-End Testing (Playwright):** Automates headless browser scenarios: logging in, selecting active organization, navigating to industrial machines, and dispatching a device command.

---

## 2. Multi-Tenant Security Verification Standard

Every API endpoint and worker must pass three automated security assertions:

1. **Missing Tenant Context Assertion:** A request without `X-KIOT-Organization-Id` must fail immediately with `400 Bad Request`.
2. **Tenant Cross-Contamination Assertion:** A user attempting to query or modify data using an organization ID they do not belong to must fail with `403 Forbidden`.
3. **PostgreSQL RLS Assertion:** Direct SQL queries executing within an active tenant transaction must never return rows belonging to another `organization_id`, even if query `WHERE` clauses are omitted.

