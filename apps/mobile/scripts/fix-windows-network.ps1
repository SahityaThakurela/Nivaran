# Run once in an elevated PowerShell (Right-click → Run as administrator)
# Fixes Expo Go "Failed to download remote update" on Windows Public Wi-Fi.

$ErrorActionPreference = "Stop"

Write-Host "Detecting Wi-Fi interface(s)..."
$wifiAliases = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.InterfaceDescription -match "Wireless|Wi-?Fi|802.11" } | Select-Object -ExpandProperty Name
if (-not $wifiAliases) {
  # Fall back to whatever interface currently has an active connection profile.
  $wifiAliases = Get-NetConnectionProfile | Select-Object -ExpandProperty InterfaceAlias
}

foreach ($alias in $wifiAliases) {
  Write-Host "Setting '$alias' network profile to Private..."
  try {
    Set-NetConnectionProfile -InterfaceAlias $alias -NetworkCategory Private
  } catch {
    Write-Warning "Could not set profile for '$alias': $_"
  }
}

Write-Host "Allowing inbound TCP 8081-8090 (Metro, incl. auto-picked fallback ports)..."
if (-not (Get-NetFirewallRule -DisplayName "Expo Metro 8081-8090" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "Expo Metro 8081-8090" `
    -Direction Inbound -Protocol TCP -LocalPort 8081-8090 -Action Allow | Out-Null
}

Write-Host "Allowing Node.js through firewall (Private + Public)..."
$nodePaths = @(
  (Get-Command node -ErrorAction SilentlyContinue)?.Source
)
Get-ChildItem "C:\Program Files\nodejs\node.exe" -ErrorAction SilentlyContinue | ForEach-Object {
  $nodePaths += $_.FullName
}
$nodePaths = $nodePaths | Where-Object { $_ } | Select-Object -Unique

foreach ($path in $nodePaths) {
  $name = "Node.js Expo ($path)"
  if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $name `
      -Direction Inbound -Program $path -Action Allow -Profile Private,Public | Out-Null
  }
}

Get-NetConnectionProfile | Format-Table Name, InterfaceAlias, NetworkCategory -AutoSize
Write-Host "Done. Restart Expo with: pnpm start"
