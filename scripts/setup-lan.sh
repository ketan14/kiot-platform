#!/usr/bin/env bash
# ==============================================================================
# KIOT Platform - WSL2 to Windows LAN Portproxy & Hosts Configuration Trigger
# Copies the PS1 script to Windows local Temp (avoiding \\wsl.localhost UNC
# access errors in elevated RunAs sessions) and runs it as Administrator.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PS_SCRIPT="$SCRIPT_DIR/setup-lan-portproxy.ps1"

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "❌ Error: powershell.exe was not found. Are you running inside WSL2 on Windows?"
  exit 1
fi

WSL_IP="$(hostname -I | awk '{print $1}')"
WIN_TEMP_WSL="/mnt/c/Users/vaghe/AppData/Local/Temp/kiot-setup-lan-portproxy.ps1"
WIN_TEMP_PATH='C:\Users\vaghe\AppData\Local\Temp\kiot-setup-lan-portproxy.ps1'

cp "$PS_SCRIPT" "$WIN_TEMP_WSL"
echo "Copied setup script to Windows Temp: $WIN_TEMP_PATH (WSL IP: $WSL_IP)"

# Run PowerShell as Administrator from local C:\ path
powershell.exe -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-ExecutionPolicy Bypass -File \"$WIN_TEMP_PATH\" -WslIp \"$WSL_IP\"'"
echo "✅ Windows LAN port forwarding & Firewall setup completed!"
