#!/usr/bin/env bash

set -euo pipefail

# Determine script and project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/docker/docker-compose.dev.yml"

echo "=================================================================="
echo "🛑 Stopping KIOT Platform Local Development Backing Services..."
echo "=================================================================="

# Check if Docker daemon is accessible
if ! docker info >/dev/null 2>&1; then
  echo "❌ Error: Docker daemon is not running or not accessible."
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "❌ Error: Docker Compose configuration not found at:"
  echo "   ${COMPOSE_FILE}"
  exit 1
fi

# Allow passing additional flags (e.g. -v / --volumes to wipe data)
EXTRA_ARGS=("$@")

if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  echo "📦 Running docker compose down with options: ${EXTRA_ARGS[*]}"
  docker compose -f "${COMPOSE_FILE}" down "${EXTRA_ARGS[@]}"
else
  docker compose -f "${COMPOSE_FILE}" down
fi

echo ""
echo "=================================================================="
echo "✅ KIOT Local Services Stopped Successfully."
echo "=================================================================="

