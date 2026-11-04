#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEED_FILE="${ROOT_DIR}/supabase/seed/seed.sql"
CONTAINER_NAME="kiot-postgres-dev"
DB_NAME="kiot_dev"
DB_USER="postgres"

echo "=================================================================="
echo "🌱 KIOT Platform - Seeding Development Data"
echo "=================================================================="

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container '${CONTAINER_NAME}' is not running."
  echo "   Start backing services first using: ./scripts/start-docker.sh"
  exit 1
fi

if [[ ! -f "${SEED_FILE}" ]]; then
  echo "❌ Error: Seed file not found at: ${SEED_FILE}"
  exit 1
fi

echo "📦 Applying seed data from: ${SEED_FILE}..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SEED_FILE}"

echo ""
echo "=================================================================="
echo "✅ Development Data Seeded Successfully!"
echo "=================================================================="

