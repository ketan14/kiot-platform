#!/usr/bin/env bash
# ==============================================================================
# KIOT Platform - Full Stack Startup Script (like WealthNest)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=================================================================="
echo "🚀 Starting KIOT Full Stack Platform"
echo "=================================================================="

cd "$ROOT_DIR"

# 1. Start Docker Backing Services & Nginx Gateway
"${SCRIPT_DIR}/start-docker.sh"

# 2. Check Database Readiness & Migrations
echo ""
echo "⏳ Checking Database Status..."
until docker exec kiot-postgres-dev pg_isready -U postgres -d kiot_dev >/dev/null 2>&1; do
  echo "   Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "✅ PostgreSQL is ready."

# 3. If passed --dev, start platform application services
if [[ "${1:-}" == "--dev" ]]; then
  echo ""
  echo "🚀 Launching Application Services (Turborepo)..."
  pnpm dev
fi
