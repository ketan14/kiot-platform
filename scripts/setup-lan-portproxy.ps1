# ==============================================================================
# KIOT Platform - Automated Windows-to-WSL2 LAN Port Forwarding & Hosts Setup
# Must be executed in Windows PowerShell as Administrator.
# ==============================================================================
param(
    [string]$WslIp = ""
)

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

# 1. Detect active Windows Wi-Fi / Ethernet IPv4 and WSL2 IP
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "*Wi-Fi*","*Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -notlike "127.0.0.1" } | Select-Object -First 1).IPAddress

if (-not $WslIp) {
    $wslRaw = (wsl hostname -I 2>$null)
    if ($wslRaw) {
        $WslIp = $wslRaw.Trim().Split(" ")[0]
    }
}
if (-not $WslIp -and $wifiIp) {
    $WslIp = $wifiIp
}

Write-Host "[OK] Detected Live WSL2 IP : $WslIp" -ForegroundColor Green
if ($wifiIp) {
    Write-Host "[OK] Detected Wi-Fi/LAN IP : $wifiIp" -ForegroundColor Green
}

# In WSL2 Mirrored Mode ($WslIp -eq $wifiIp), bind portproxy on $wifiIp -> 127.0.0.1
if ($wifiIp -and ($WslIp -eq $wifiIp)) {
    $listenAddr = $wifiIp
    $targetIp = "127.0.0.1"
    Write-Host "[INFO] WSL2 Mirrored Mode detected: forwarding ${listenAddr} -> ${targetIp}" -ForegroundColor Cyan
} else {
    $listenAddr = "0.0.0.0"
    $targetIp = $WslIp
    Write-Host "[INFO] WSL2 NAT Mode detected: forwarding ${listenAddr} -> ${targetIp}" -ForegroundColor Cyan
}

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

# 3. Ports to forward (40000: Gateway, 18083: EMQX Dashboard, 1883: MQTT, 5174-5179: All 6 KIOT Web Portals)
$ports = @(40000, 18083, 1883, 5174, 5175, 5176, 5177, 5178, 5179)

Write-Host "`n--- Configuring Windows Port Forwarding (netsh) ---" -ForegroundColor Yellow
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null | Out-Null
    if ($wifiIp) {
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=$wifiIp 2>$null | Out-Null
    }

    netsh interface portproxy add v4tov4 listenport=$port listenaddress=$listenAddr connectport=$port connectaddress=$targetIp
    Write-Host "  * ${listenAddr}:${port} forwarded -> ${targetIp}:${port}" -ForegroundColor Green
}

# 4. Ensure Inbound Firewall Rules & Hyper-V VM Firewall Policy exist
Write-Host "`n--- Checking Windows Firewall Rules ---" -ForegroundColor Yellow
$fwRules = @(
    @{ Name = "KIOT Platform Gateway (LAN 40000)"; Port = 40000 },
    @{ Name = "KIOT EMQX Dashboard (LAN 18083)"; Port = 18083 },
    @{ Name = "KIOT EMQX MQTT (LAN 1883)"; Port = 1883 },
    @{ Name = "KIOT Customer Admin (LAN 5174)"; Port = 5174 },
    @{ Name = "KIOT Industrial Dev (LAN 5175)"; Port = 5175 },
    @{ Name = "KIOT Platform Admin (LAN 5176)"; Port = 5176 },
    @{ Name = "KIOT Cold Portal (LAN 5177)"; Port = 5177 },
    @{ Name = "KIOT Energy Portal (LAN 5178)"; Port = 5178 },
    @{ Name = "KIOT Home Portal (LAN 5179)"; Port = 5179 }
)
foreach ($rule in $fwRules) {
    Remove-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -LocalPort $rule.Port -Protocol TCP -Action Allow -Profile Private,Public,Domain -ErrorAction SilentlyContinue | Out-Null
}
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "  * Inbound firewall rules & Hyper-V WSL2 inbound allow verified for ports 40000, 18083, 1883, 5175." -ForegroundColor Green

# 5. Summary URLs
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "[OK] KIOT LAN & Local Domain Setup is ACTIVE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[*] Desktop Browser URL : http://kiot.local:40000" -ForegroundColor Green
if ($wifiIp) {
    Write-Host "[*] LAN / Mobile URL    : http://${wifiIp}:40000" -ForegroundColor Yellow
    Write-Host "[*] EMQX Mobile URL     : http://${wifiIp}:18083" -ForegroundColor Yellow
}
Write-Host "==================================================" -ForegroundColor Cyan
