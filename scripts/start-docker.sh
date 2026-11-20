#!/usr/bin/env bash

set -euo pipefail

# Determine script and project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/docker/docker-compose.dev.yml"
PROXY_PORT="${KIOT_PROXY_PORT:-40000}"

echo "=================================================================="
echo "🚀 Starting KIOT Platform Local Development Backing Services..."
echo "=================================================================="

# Check if Docker daemon is accessible
if ! docker info >/dev/null 2>&1; then
  echo "❌ Error: Docker daemon is not running or not accessible."
  echo "   Please start Docker Desktop or the Docker service and try again."
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "❌ Error: Docker Compose configuration not found at:"
  echo "   ${COMPOSE_FILE}"
  exit 1
fi

echo "📦 Using Compose configuration: ${COMPOSE_FILE}"
docker compose -f "${COMPOSE_FILE}" up -d

# Cleanly hide the commercial "Upgrade ->" button from the EMQX dashboard
docker exec kiot-emqx-dev sh -c 'grep -q "go-link" /opt/emqx/lib/emqx_dashboard-*/priv/www/index.html 2>/dev/null || sed -i "s|</head>|<style>.go-link{display:none!important}</style></head>|" /opt/emqx/lib/emqx_dashboard-*/priv/www/index.html 2>/dev/null || true' >/dev/null 2>&1 || true

echo ""
echo "=================================================================="
echo "✅ KIOT Local Services & Unified Gateway are LIVE!"
echo "=================================================================="
echo "🌐 Unified Platform Gateway (Port ${PROXY_PORT}):"
echo "  • Industrial Portal:   http://kiot.local:${PROXY_PORT}/"
echo "  • REST API Service:    http://kiot.local:${PROXY_PORT}/v1/"
echo "  • Swagger API Docs:    http://kiot.local:${PROXY_PORT}/docs"
echo "  • Telemetry WebSocket: ws://kiot.local:${PROXY_PORT}/ws"
echo "  • Database UI (Adminer): http://kiot.local:${PROXY_PORT}/adminer/"
echo ""
echo "⚙️ Dedicated Developer Ports:"
echo "  • EMQX Dashboard:      http://kiot.local:18083 (admin / kiotadmin123)"
echo "  • EMQX MQTT (TCP):     localhost:1883"
echo "  • PostgreSQL / Timescale: localhost:5432 (user: postgres, db: kiot_dev)"
echo "  • Redis Pub/Sub:        localhost:6380 (mapped to 6379)"
echo "  • Adminer Direct Port:  http://localhost:8085"
echo "=================================================================="
echo "💡 To configure Windows hosts & LAN access, run: ./scripts/setup-lan.sh"
echo "💡 To start app microservices, run: pnpm dev"
echo "💡 To stop backing services, run: ./scripts/stop-docker.sh"
echo "=================================================================="
