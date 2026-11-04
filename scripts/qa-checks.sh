#!/usr/bin/env bash

# ==============================================================================
# KIOT Platform – Automated QA Pre-Flight Verification Script
# Checks all mandatory infrastructure, database, services, and frontend health.
# ==============================================================================

set -uo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

PASS_ICON="${GREEN}✔ [PASS]${RESET}"
FAIL_ICON="${RED}✘ [FAIL]${RESET}"
WARN_ICON="${YELLOW}⚠ [WARN]${RESET}"
INFO_ICON="${CYAN}ℹ [INFO]${RESET}"

FAILURES=0
WARNINGS=0
TOTAL_CHECKS=0

function check_pass() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -e "  ${PASS_ICON} $1"
}

function check_fail() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FAILURES=$((FAILURES + 1))
  echo -e "  ${FAIL_ICON} $1"
  if [[ -n "${2:-}" ]]; then
    echo -e "    ${YELLOW}↳ Remediation:${RESET} $2"
  fi
}

function check_warn() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  WARNINGS=$((WARNINGS + 1))
  echo -e "  ${WARN_ICON} $1"
  if [[ -n "${2:-}" ]]; then
    echo -e "    ${YELLOW}↳ Note:${RESET} $2"
  fi
}

echo -e "\n${BOLD}${CYAN}==================================================================${RESET}"
echo -e "${BOLD}${CYAN}🧪 KIOT PLATFORM – QA PRE-FLIGHT VERIFICATION SUITE${RESET}"
echo -e "${BOLD}${CYAN}==================================================================${RESET}\n"

# ------------------------------------------------------------------------------
# 1. Host Tooling & Runtime Checks
# ------------------------------------------------------------------------------
echo -e "${BOLD}▶ [1/6] Checking Host Tooling & Environments...${RESET}"

if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  check_pass "Node.js installed (${NODE_VER})"
else
  check_fail "Node.js is not installed" "Install Node.js LTS (v20+ or v22+)"
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_VER=$(pnpm -v)
  check_pass "pnpm installed (v${PNPM_VER})"
else
  check_fail "pnpm is not installed" "Install pnpm globally (npm i -g pnpm)"
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  check_pass "Docker engine running & accessible"
else
  check_fail "Docker daemon not running or socket not accessible" "Start Docker Desktop or service (sudo systemctl start docker)"
fi

# ------------------------------------------------------------------------------
# 2. Backing Docker Services Checks
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}▶ [2/6] Checking Backing Docker Containers...${RESET}"

# Postgres / TimescaleDB
if docker ps --format '{{.Names}}' | grep -q "^kiot-postgres-dev$"; then
  PG_HEALTH=$(docker inspect kiot-postgres-dev --format '{{.State.Health.Status}}' 2>/dev/null || echo "running")
  if [[ "${PG_HEALTH}" == "healthy" || "${PG_HEALTH}" == "running" ]]; then
    check_pass "PostgreSQL + TimescaleDB container running (Status: ${PG_HEALTH}, Port: 5432)"
  else
    check_fail "PostgreSQL container status is '${PG_HEALTH}'" "Run: docker compose restart postgres"
  fi
else
  check_fail "Container 'kiot-postgres-dev' is not running" "Run: pnpm docker:up"
fi

# Redis
if docker ps --format '{{.Names}}' | grep -q "^kiot-redis-dev$"; then
  REDIS_HEALTH=$(docker inspect kiot-redis-dev --format '{{.State.Health.Status}}' 2>/dev/null || echo "running")
  if [[ "${REDIS_HEALTH}" == "healthy" || "${REDIS_HEALTH}" == "running" ]]; then
    check_pass "Redis container running (Status: ${REDIS_HEALTH}, Host Port: 6380)"
  else
    check_fail "Redis container status is '${REDIS_HEALTH}'" "Run: docker compose restart redis"
  fi
else
  check_fail "Container 'kiot-redis-dev' is not running" "Run: pnpm docker:up"
fi

# EMQX MQTT
if docker ps --format '{{.Names}}' | grep -q "^kiot-emqx-dev$"; then
  EMQX_HEALTH=$(docker inspect kiot-emqx-dev --format '{{.State.Health.Status}}' 2>/dev/null || echo "running")
  if [[ "${EMQX_HEALTH}" == "healthy" || "${EMQX_HEALTH}" == "running" ]]; then
    check_pass "EMQX MQTT 5.0 broker running (Status: ${EMQX_HEALTH}, Ports: 1883, 8883, 18083)"
  else
    check_fail "EMQX container status is '${EMQX_HEALTH}'" "Run: docker compose restart emqx"
  fi
else
  check_fail "Container 'kiot-emqx-dev' is not running" "Run: pnpm docker:up"
fi

# ------------------------------------------------------------------------------
# 3. Database Schema, Hypertables, & Seed Verification
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}▶ [3/6] Checking Database Migrations & Seed Data...${RESET}"

if docker ps --format '{{.Names}}' | grep -q "^kiot-postgres-dev$"; then
  # Check hypertable
  HYPERTABLE_EXISTS=$(docker exec kiot-postgres-dev psql -U postgres -d kiot_dev -tAc \
    "SELECT count(*) FROM _timescaledb_catalog.hypertable WHERE table_name = 'telemetry_readings';" 2>/dev/null || echo "0")
  if [[ "${HYPERTABLE_EXISTS}" -ge 1 ]]; then
    check_pass "TimescaleDB hypertable 'telemetry_readings' active"
  else
    check_fail "TimescaleDB hypertable 'telemetry_readings' missing" "Run: pnpm db:migrate"
  fi

  # Check seed organization & machines
  COUNTS=$(docker exec kiot-postgres-dev psql -U postgres -d kiot_dev -tAc "
    SELECT 
      (SELECT count(*) FROM organizations WHERE id = '00000000-0000-4000-a000-000000000001') || ':' ||
      (SELECT count(*) FROM industrial_machines WHERE machine_code IN ('CNC-01', 'LATHE-02')) || ':' ||
      (SELECT count(*) FROM devices WHERE id IN ('DEV-ESP32-001', 'DEV-METER-001'));
  " 2>/dev/null || echo "0:0:0")

  IFS=':' read -r ORG_COUNT MACHINE_COUNT DEVICE_COUNT <<< "${COUNTS}"

  if [[ "${ORG_COUNT:-0}" -ge 1 && "${MACHINE_COUNT:-0}" -ge 2 && "${DEVICE_COUNT:-0}" -ge 2 ]]; then
    check_pass "Demo Seed Data Present (Org: Apex Precision, Machines: ${MACHINE_COUNT}, Devices: ${DEVICE_COUNT})"
  else
    check_fail "Demo seed data missing or incomplete in kiot_dev" "Run: pnpm db:seed"
  fi
else
  check_fail "Skipping DB checks (Postgres container offline)" "Start Postgres container first"
fi

# ------------------------------------------------------------------------------
# 4. Backend Microservices Health
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}▶ [4/6] Checking Backend Microservices...${RESET}"

# Fastify REST API (Port 3000)
API_HEALTH=$(curl -s -m 3 http://localhost:3000/health 2>/dev/null || echo "")
if [[ "${API_HEALTH}" == *"\"status\":\"ok\""* ]]; then
  check_pass "REST API Service healthy (http://localhost:3000/health)"
else
  check_fail "REST API Service is not responding on port 3000" "Run: pnpm dev:api"
fi

# REST API Swagger UI Docs
API_DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 3 http://localhost:3000/docs 2>/dev/null || echo "000")
if [[ "${API_DOCS_STATUS}" == "200" || "${API_DOCS_STATUS}" == "302" ]]; then
  check_pass "OpenAPI Swagger UI interactive docs accessible (http://localhost:3000/docs)"
else
  check_warn "OpenAPI Swagger docs returned HTTP ${API_DOCS_STATUS}"
fi

# WebSocket Gateway (Port 3001)
WS_HEALTH=$(curl -s -m 3 http://localhost:3001/health 2>/dev/null || echo "")
if [[ "${WS_HEALTH}" == *"\"status\":\"ok\""* ]]; then
  ACTIVE_CONNS=$(echo "${WS_HEALTH}" | grep -o '"activeConnections":[0-9]*' | cut -d':' -f2 || echo "0")
  check_pass "WebSocket Gateway healthy (ws://localhost:3001, Active Clients: ${ACTIVE_CONNS})"
else
  check_fail "WebSocket Gateway is not responding on port 3001" "Run: pnpm dev:ws"
fi

# ------------------------------------------------------------------------------
# 5. Frontend Dashboard & Proxy Health
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}▶ [5/6] Checking Frontend Development Application...${RESET}"

FRONTEND_HTML=$(curl -s -m 3 http://localhost:5173/ 2>/dev/null || echo "")
if [[ "${FRONTEND_HTML}" == *"KIOT Industrial"* ]]; then
  check_pass "Vite Frontend Application running (http://localhost:5173/)"
else
  check_fail "Frontend Dashboard is not serving on port 5173" "Run: pnpm dev:industrial"
fi

# Check Vite Proxy to backend (/v1/machines)
PROXY_TEST=$(curl -s -m 3 -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" http://localhost:5173/v1/machines 2>/dev/null || echo "")
if [[ "${PROXY_TEST}" == *"\"machines\""* ]]; then
  check_pass "Frontend Vite Reverse Proxy to Backend API working (/v1/machines)"
else
  check_warn "Vite proxy test to /v1/machines did not return expected JSON" "Ensure API (3000) and Frontend (5173) are both running"
fi

# ------------------------------------------------------------------------------
# 6. Live Telemetry Activity & Simulation
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}▶ [6/6] Checking Real-Time Telemetry Pipeline & Cache...${RESET}"

HOT_CACHE=$(curl -s -m 3 -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" \
  "http://localhost:3000/v1/telemetry/latest?device_id=DEV-ESP32-001" 2>/dev/null || echo "")

if [[ "${HOT_CACHE}" == *"\"source\":\"redis_hot_cache\""* ]]; then
  check_pass "Live Telemetry Hot Cache populated in Redis (spindle_speed, vibration, temp active)"
else
  check_warn "Redis hot cache has not received recent sensor packets for DEV-ESP32-001" \
    "Start telemetry stream simulator: pnpm sim:telemetry"
fi

# ------------------------------------------------------------------------------
# Final Summary Report
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}${CYAN}==================================================================${RESET}"
echo -e "${BOLD}${CYAN}📊 QA VERIFICATION SUMMARY REPORT${RESET}"
echo -e "${BOLD}${CYAN}==================================================================${RESET}"
echo -e "  • Total Checks Evaluated: ${BOLD}${TOTAL_CHECKS}${RESET}"
echo -e "  • Passed Checks:          ${GREEN}${BOLD}$((TOTAL_CHECKS - FAILURES - WARNINGS))${RESET}"
echo -e "  • Warnings:               ${YELLOW}${BOLD}${WARNINGS}${RESET}"
echo -e "  • Failures:               ${RED}${BOLD}${FAILURES}${RESET}"
echo -e "${BOLD}${CYAN}==================================================================${RESET}"

if [[ "${FAILURES}" -eq 0 ]]; then
  echo -e "\n${GREEN}${BOLD}🎉 ALL MANDATORY QA CHECKS PASSED!${RESET}"
  echo -e "   The application environment is fully certified for browser testing."
  echo -e "   ${BOLD}👉 Open Dashboard:${RESET} ${CYAN}http://localhost:5173/${RESET}\n"
  exit 0
else
  echo -e "\n${RED}${BOLD}❌ ${FAILURES} MANDATORY QA CHECK(S) FAILED!${RESET}"
  echo -e "   Please resolve the failed checks above before beginning testing.\n"
  exit 1
fi

