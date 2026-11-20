# ==============================================================================
# KIOT Platform - Automated Windows-to-WSL2 LAN Port Forwarding & Hosts Setup
# Must be executed in Windows PowerShell as Administrator.
# ==============================================================================

# Ensure running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator." -ForegroundColor Red
    Write-Host "[INFO] Please right-click PowerShell -> 'Run as Administrator', then execute this script." -ForegroundColor Yellow
    Exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " KIOT Platform - LAN Setup & Hosts Configuration" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Automatically detect WSL2 IP
$wslRaw = (wsl hostname -I)
$wslIp = $wslRaw.Trim().Split(" ")[0]

if (-not $wslIp -or $wslIp -notmatch '^\d+\.\d+\.\d+\.\d+$') {
    Write-Host "[ERROR] Could not automatically detect WSL2 IP. Is WSL2 running?" -ForegroundColor Red
    Exit 1
}

Write-Host "[OK] Detected Live WSL2 IP : $wslIp" -ForegroundColor Green

# 2. Configure Windows Hosts file for kiot.local
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue

if ($hostsContent -notmatch 'kiot\.local') {
    Write-Host "`n--- Adding kiot.local to Windows Hosts File ---" -ForegroundColor Yellow
    Add-Content -Path $hostsPath -Value "`n127.0.0.1 kiot.local"
    Write-Host "  * Added: 127.0.0.1 kiot.local to $hostsPath" -ForegroundColor Green
} else {
    Write-Host "[OK] 'kiot.local' is already configured in Windows hosts file." -ForegroundColor Green
}

# 3. Ports to forward (40000: Gateway, 18083: EMQX Dashboard, 1883: MQTT)
$ports = @(40000, 18083, 1883)

Write-Host "`n--- Configuring Windows Port Forwarding (netsh) ---" -ForegroundColor Yellow
foreach ($port in $ports) {
    # Remove existing stale rule if any
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
    
    # Add fresh rule pointing to current WSL2 IP
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp
    Write-Host "  * Port $port forwarded -> ${wslIp}:${port}" -ForegroundColor Green
}

# 4. Ensure Inbound Firewall Rules exist
Write-Host "`n--- Checking Windows Firewall Rules ---" -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "KIOT Platform Gateway (LAN 40000)" -Direction Inbound -LocalPort 40000 -Protocol TCP -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "KIOT EMQX Dashboard (LAN 18083)" -Direction Inbound -LocalPort 18083 -Protocol TCP -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "KIOT EMQX MQTT (LAN 1883)" -Direction Inbound -LocalPort 1883 -Protocol TCP -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
Write-Host "  * Inbound firewall rules verified for ports 40000, 18083, 1883." -ForegroundColor Green

# 5. Detect Wi-Fi / Local Network IP
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "*Wi-Fi*","*Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -notlike "127.0.0.1" } | Select-Object -First 1).IPAddress

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "[OK] KIOT LAN & Local Domain Setup is ACTIVE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[*] Desktop Browser URL : http://kiot.local:40000" -ForegroundColor Green
if ($wifiIp) {
    Write-Host "[*] Mobile / Tablet URL : http://${wifiIp}:40000" -ForegroundColor Yellow
} else {
    Write-Host "[*] Mobile / Tablet URL : http://<Your-Windows-IP>:40000" -ForegroundColor Yellow
}
Write-Host "==================================================" -ForegroundColor Cyan
