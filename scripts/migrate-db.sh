#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/supabase/migrations"
CONTAINER_NAME="kiot-postgres-dev"
DB_NAME="kiot_dev"
DB_USER="postgres"

echo "=================================================================="
echo "⚡ KIOT Platform - Applying Database Migrations"
echo "=================================================================="

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container '${CONTAINER_NAME}' is not running."
  echo "   Start backing services first using: ./scripts/start-docker.sh"
  exit 1
fi

# Optional reset
if [[ "${1:-}" == "--reset" ]]; then
  echo "⚠️  Reset flag detected! Recreating public schema..."
  docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" <<EOF
DROP SCHEMA IF EXISTS app CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF
  echo "✅ Public schema reset complete."
fi

# Apply migrations in alphabetical/version order
echo "📦 Applying migrations from: ${MIGRATIONS_DIR}"
for migration in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
  filename="$(basename "${migration}")"
  echo "   ► Executing: ${filename}..."
  docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${migration}"
  echo "     ✓ Applied successfully."
done

echo ""
echo "=================================================================="
echo "✅ All Migrations Applied Successfully!"
echo "=================================================================="

