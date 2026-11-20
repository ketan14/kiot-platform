#!/usr/bin/env bash
# ==============================================================================
# KIOT Platform - Full Stack Shutdown Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=================================================================="
echo "🛑 Stopping KIOT Platform Services..."
echo "=================================================================="

"${SCRIPT_DIR}/stop-docker.sh"

echo "✅ All KIOT services stopped successfully."
