#!/usr/bin/env bash

set -euo pipefail

# Determine script and project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/docker/docker-compose.dev.yml"

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

echo ""
echo "=================================================================="
echo "✅ KIOT Local Services Started Successfully!"
echo "=================================================================="
echo "  • EMQX Dashboard:      http://localhost:18083 (admin / kiotadmin123)"
echo "  • EMQX MQTT TCP:       localhost:1883"
echo "  • EMQX MQTT TLS:       localhost:8883"
echo "  • EMQX WebSocket:      ws://localhost:8083/mqtt"
echo "  • PostgreSQL/Timescale: localhost:5432 (user: postgres, db: kiot_dev)"
echo "  • Adminer (DB Web UI):  http://localhost:8085 (phpMyAdmin for PostgreSQL)"
echo "  • Redis Pub/Sub:        localhost:6380 (port 6380 mapped to 6379)"
echo "=================================================================="
echo "To view logs, run: docker compose -f ${COMPOSE_FILE} logs -f"
echo "To stop services, run: ./scripts/stop-docker.sh"
echo "=================================================================="

