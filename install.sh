#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BOLD}🦗 ClaWire — Smartphone Signal Layer for OpenClaw${NC}"
echo -e "${YELLOW}Installing...${NC}"
echo ""

command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install from nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

echo "📦 Installing server dependencies..."
cd server
npm install --legacy-peer-deps --silent
npm run build
cd ..
echo "✅ Server dependencies installed"

if [ ! -f clawire.yaml ]; then
  echo "Setting up ClaWire..."
  read -p "Your name (for AI context): " USER_NAME
  read -p "Timezone (e.g. Asia/Seoul): " USER_TZ
  cat > clawire.yaml <<EOF
user:
  name: "${USER_NAME}"
  timezone: "${USER_TZ}"
  locale: "ko"
tunnel:
  url: ""
server:
  port: 3002
  quiet_hours_start: 23
  quiet_hours_end: 7
openclaw:
  hooks_url: "http://127.0.0.1:18789"
  hooks_token: "openmantis-hook-2026"
push:
  expo_token: ""
discord_log:
  enabled: false
  channel_id: ""
EOF
fi

if command -v openclaw &> /dev/null; then
  HOOK_TOKEN=$(openssl rand -hex 8)
  openclaw config set hooks.enabled true
  openclaw config set hooks.token "$HOOK_TOKEN"
  sed -i.bak "s/hooks_token: .*/hooks_token: \"$HOOK_TOKEN\"/" clawire.yaml
  rm -f clawire.yaml.bak
  echo "✅ OpenClaw hooks configured (token: $HOOK_TOKEN)"
  echo "⚠️  Restart OpenClaw gateway: openclaw gateway restart"
else
  echo "⚠️  openclaw not found. Install OpenClaw first: https://openclaw.ai"
fi

echo ""
echo "=== Cloudflare Tunnel Setup (optional, for remote access) ==="
echo "This lets your iPhone connect when away from home WiFi."
read -p "Set up Cloudflare Tunnel now? (y/N): " SETUP_TUNNEL
if [[ "$SETUP_TUNNEL" =~ ^[Yy]$ ]]; then
  if ! command -v cloudflared &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew install cloudflare/cloudflare/cloudflared
    elif [[ "$OSTYPE" == "linux"* ]]; then
      echo "Download cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
      echo "Then run: cloudflared tunnel --url http://localhost:3002"
    fi
  fi
  if command -v cloudflared &> /dev/null; then
    echo "Starting tunnel... (press Ctrl+C after you see the tunnel URL)"
    echo "Then add the URL to clawire.yaml under tunnel.url"
    cloudflared tunnel --url http://localhost:3002
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}✅ ClaWire installed!${NC}"
