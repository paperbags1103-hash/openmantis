# 🦗 ClaWire

> Smartphone signal layer for OpenClaw. Give your AI eyes and ears in the physical world.

ClaWire connects your iPhone to OpenClaw, letting Chire (your AI) receive real-world signals and proactively notify you — without you asking.

## How it works

```
iPhone signals → ClaWire server → OpenClaw webhook → Chire (AI) → Push notification
GPS · Battery · Calendar · Motion · AppState
```

## Signals detected

| Signal | Trigger |
|--------|---------|
| `geofence_enter/exit` | Entering/leaving a location zone |
| `battery_low` | Battery below 20% |
| `battery_charging` | Plugged in (likely sitting down) |
| `app_foreground` | Phone picked up after 5+ min |
| `calendar_upcoming` | Event starting in 30 min |

## Requirements

- OpenClaw installed and running
- Node.js 18+
- iPhone with Expo Go app

## Install

```bash
git clone https://github.com/paperbags1103-hash/openmantis clawire
cd clawire
./install.sh
```

## Configuration

Edit `server/.env`:
```env
OPENCLAW_HOOKS_TOKEN=your-token  # from openclaw config set hooks.token
EXPO_PUSH_TOKEN=ExponentPushToken[...]  # from your Expo app
```

## Mobile app

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

Scan QR with Expo Go on iPhone.
