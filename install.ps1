# ClaWire Installer for Windows
# Run in PowerShell: .\install.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== ClaWire Installer ===" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found." -ForegroundColor Red
    exit 1
}

# Check openclaw
$hasOpenClaw = $null -ne (Get-Command openclaw -ErrorAction SilentlyContinue)
if (-not $hasOpenClaw) {
    Write-Host "WARNING: openclaw not found. Install OpenClaw first: https://openclaw.ai" -ForegroundColor Yellow
}

# Create clawire.yaml if missing
if (-not (Test-Path "clawire.yaml")) {
    $userName = Read-Host "Your name (for AI context)"
    $timezone = Read-Host "Timezone (e.g. Asia/Seoul)"
    
    $yamlContent = @"
user:
  name: "$userName"
  timezone: "$timezone"
  locale: "ko"
tunnel:
  url: ""
server:
  port: 3002
  quiet_hours_start: 23
  quiet_hours_end: 7
openclaw:
  hooks_url: "http://127.0.0.1:18789"
  hooks_token: ""
push:
  expo_token: ""
discord_log:
  enabled: false
  channel_id: ""
"@
    Set-Content -Path "clawire.yaml" -Value $yamlContent
    Write-Host "✅ clawire.yaml created" -ForegroundColor Green
}

# Install server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Cyan
Set-Location server
npm install
npm run build
Set-Location ..

# Configure OpenClaw hooks
if ($hasOpenClaw) {
    $token = -join ((48..57) + (97..102) | Get-Random -Count 16 | ForEach-Object {[char]$_})
    openclaw config set hooks.enabled true
    openclaw config set hooks.token $token
    # Update clawire.yaml with token
    (Get-Content clawire.yaml) -replace 'hooks_token: ""', "hooks_token: `"$token`"" | Set-Content clawire.yaml
    Write-Host "✅ OpenClaw hooks configured (token: $token)" -ForegroundColor Green
    Write-Host "⚠️  Restart OpenClaw gateway: openclaw gateway restart" -ForegroundColor Yellow
}

# Start with pm2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    pm2 start server/dist/index.js --name clawire-server --cwd (Get-Location).Path
    pm2 save
    Write-Host "✅ ClaWire server started via pm2" -ForegroundColor Green
} else {
    Write-Host "pm2 not found. Start manually: node server/dist/index.js" -ForegroundColor Yellow
    Write-Host "Or install pm2: npm install -g pm2" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== ClaWire installed! ===" -ForegroundColor Green
Write-Host "Open http://localhost:3002/setup in browser to pair your iPhone" -ForegroundColor Cyan
