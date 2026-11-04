# Local Database Inspection & Management Guide

This guide covers how to connect to, inspect, and query the local PostgreSQL 16 + TimescaleDB database running in Docker.

---

## 1. Connection Credentials

| Parameter | Value |
| :--- | :--- |
| **Host** | `localhost` or `127.0.0.1` |
| **Port** | `5432` |
| **Database Name** | `kiot_dev` |
| **Username** | `postgres` |
| **Password** | `postgres` |
| **Connection URL** | `postgresql://postgres:postgres@localhost:5432/kiot_dev` |
| **Docker Container** | `kiot-postgres-dev` |
| **Web UI (Adminer)** | `http://localhost:8085/` (phpMyAdmin equivalent) |

---

## 2. Web Browser Access (Adminer – phpMyAdmin Equivalent)

The local Docker development stack includes **Adminer** (`kiot-adminer-dev`), a lightweight web-based database management tool functioning identically to phpMyAdmin.

- **Web UI URL:** **[http://localhost:8085/](http://localhost:8085/)**
- **Direct Login Link:** **[http://localhost:8085/?pgsql=postgres&username=postgres&db=kiot_dev](http://localhost:8085/?pgsql=postgres&username=postgres&db=kiot_dev)**

### Login Form Fields:
- **System:** `PostgreSQL`
- **Server:** `postgres` *(inside Docker network)* or `localhost`
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `kiot_dev`

### Capabilities in Browser:
- Browse, filter, sort, and edit rows inline in all 15 relational and time-series tables.
- Execute ad-hoc SQL queries with syntax highlighting and results export (CSV, SQL).
- Inspect database schema, indexes, foreign keys, triggers, and TimescaleDB hypertables.
- Visual database diagram and entity relationship map.

---

## 3. Quick Command-Line Access (psql)

### Option A: Interactive psql Shell
Launch an interactive `psql` session inside the running container:
```bash
# Via npm script
pnpm db:psql

# Or directly with Docker
docker exec -it kiot-postgres-dev psql -U postgres -d kiot_dev
```

### Option B: Quick List of All Tables
```bash
pnpm db:tables
```

### Option C: Execute Single SQL Queries
```bash
docker exec -it kiot-postgres-dev psql -U postgres -d kiot_dev -c "SELECT count(*) FROM telemetry_readings;"
```

---

## 3. Connecting via GUI Tools (DBeaver, TablePlus, pgAdmin, DataGrip, VS Code)

You can connect any standard PostgreSQL client with the parameters:
1. **Connection Type:** PostgreSQL
2. **Host:** `localhost`
3. **Port:** `5432`
4. **Database:** `kiot_dev`
5. **Username:** `postgres`
6. **Password:** `postgres`
7. **SSL Mode:** `disable` (or `allow`)

---

## 4. Useful Inspection Queries

### 4.1 Inspect Devices & Connectivity Status
```sql
SELECT id, organization_id, product_id, name, status, firmware_version, last_seen_at 
FROM devices 
ORDER BY last_seen_at DESC NULLS LAST;
```

### 4.2 Inspect Industrial Machines & Operating Hours
```sql
SELECT id, name, machine_code, category, status, current_operating_hours, primary_device_id 
FROM industrial_machines;
```

### 4.3 Inspect Live Time-Series Telemetry (TimescaleDB)
```sql
-- Total readings count in TimescaleDB hypertable
SELECT count(*) AS total_readings FROM telemetry_readings;

-- View latest 10 readings streamed by edge devices
SELECT time, device_id, metric, value, unit 
FROM telemetry_readings 
ORDER BY time DESC 
LIMIT 10;
```

### 4.4 Inspect Device Commands & ACKs
```sql
SELECT id, device_id, command_type, payload, status, acknowledged_at, completed_at, created_at 
FROM device_commands 
ORDER BY created_at DESC 
LIMIT 5;
```

### 4.5 Inspect Active Alarms & Incident History
```sql
-- Configured threshold alert rules
SELECT id, name, metric, condition, threshold, severity, is_enabled 
FROM alert_rules;

-- Recent incidents (open, acknowledged, and resolved)
SELECT id, device_id, metric, trigger_value, threshold_value, severity, status, title, created_at, resolved_at 
FROM incidents 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4.6 Inspect TimescaleDB Hypertable Details & Chunks
```sql
SELECT hypertable_schema, hypertable_name, num_dimensions, num_chunks, is_distributed 
FROM timescaledb_information.hypertables;
```

---

## 5. Simulating Multi-Tenant User Sessions (RLS)

By default, the `postgres` superuser has permissions to read all tables. However, table Row-Level Security (RLS) policies evaluate `app.current_user_id` and `app.current_org_id`.

To test queries as a specific tenant or user inside `psql`:

```sql
-- Switch to demo tenant context
SET app.current_user_id = '00000000-0000-4000-b000-000000000001';
SET app.current_org_id = '00000000-0000-4000-a000-000000000001';

-- Now queries strictly respect tenant isolation policies
SELECT * FROM devices;
SELECT * FROM industrial_machines;

-- Reset session variables
RESET app.current_user_id;
RESET app.current_org_id;
```

---

## 6. Database Maintenance & Reset Scripts

From the repository root:

```bash
# Re-apply migrations
pnpm db:migrate

# Seed development data (Demo organization, devices, machines)
pnpm db:seed

# Complete reset and re-seed (wipes public schema and re-applies everything)
pnpm db:reset
```

