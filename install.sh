#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BOLD}🦗 ClaWire — Smartphone Signal Layer for OpenClaw${NC}"
echo -e "${YELLOW}Installing...${NC}"
echo ""

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install from nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }
command -v openclaw >/dev/null 2>&1 || { echo "❌ OpenClaw required. Install from https://openclaw.ai"; exit 1; }

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server && npm install --legacy-peer-deps --silent
echo "✅ Server dependencies installed"

# Setup .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env from template"
  echo -e "${YELLOW}⚠️  Edit server/.env and set OPENCLAW_HOOKS_TOKEN and EXPO_PUSH_TOKEN${NC}"
fi

# Configure OpenClaw hooks
echo "🔗 Configuring OpenClaw hooks..."
TOKEN=$(grep OPENCLAW_HOOKS_TOKEN .env | cut -d= -f2)
if [ -n "$TOKEN" ]; then
  openclaw config set hooks.enabled true
  openclaw config set hooks.token "$TOKEN"
  openclaw gateway restart 2>/dev/null || true
  echo "✅ OpenClaw hooks configured"
else
  echo -e "${YELLOW}⚠️  Set OPENCLAW_HOOKS_TOKEN in server/.env then run: openclaw config set hooks.token YOUR_TOKEN${NC}"
fi

cd ..

# Start with pm2 if available
if command -v pm2 >/dev/null 2>&1; then
  echo "🚀 Starting ClaWire server with pm2..."
  cd server
  pm2 delete clawire-server 2>/dev/null || true
  pm2 start "node dist/index.js" --name clawire-server
  pm2 save
  echo "✅ ClaWire server running (pm2: clawire-server)"
  cd ..
else
  echo -e "${YELLOW}ℹ️  Start manually: cd server && npm run build && node dist/index.js${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}✅ ClaWire installed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Install the mobile app via Expo Go (scan QR from expo start)"
echo "  2. Open ClaWire app → Settings → Enable all signal watchers"
echo "  3. Test: curl -X POST http://localhost:3002/api/events -H 'Content-Type: application/json' -d '{\"type\":\"geofence_enter\",\"source\":\"test\",\"data\":{\"zone\":\"home\"}}'"
echo ""
echo "Docs: https://github.com/paperbags1103-hash/openmantis"
