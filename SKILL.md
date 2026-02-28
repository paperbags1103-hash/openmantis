# ClaWire — OpenClaw Plugin

ClaWire gives 치레 (your OpenClaw AI) the ability to sense your iPhone's physical context and send proactive Korean push notifications.

## Architecture

```
iPhone (GPS/battery/calendar/WiFi/AppState)
  → ClaWire Server (port 3002, your machine)
  → OpenClaw webhook → 치레 judges
  → POST /api/push → iPhone
```

## Server Endpoints

- `GET  /api/health` — health check
- `POST /api/events` — receive signals from iPhone
- `GET  /setup`      — QR pairing page (open in browser)
- `POST /setup/pair` — called by app after QR scan
- `POST /api/push`   — loopback only, 치레 sends push here

## Signal Types

- `geofence_enter` / `geofence_exit` — GPS location zones
- `battery_low` / `battery_charging` / `battery_full`
- `calendar_upcoming` — event within 25-35 min
- `wifi_connected` / `wifi_disconnected` / `wifi_state`
- `app_foreground` / `app_background`

## How 치레 Should Respond to ClaWire Signals

When you receive a ClaWire webhook, you will see:
- Signal type and data
- User context (name, timezone)
- Today's signal history
- Queued bundled events

Your job:
1. Read the signal context
2. Check MEMORY.md for user preferences and ongoing context
3. Decide if this warrants a push notification (not every signal does)
4. If yes: POST to http://localhost:3002/api/push with {"title": "ClaWire", "message": "..."}
5. Keep messages short (1-2 sentences), in Korean, practical and personal

## Config: clawire.yaml

Located at project root. Edit to customize:
- `user.name` — used in AI context
- `server.quiet_hours_start/end` — no notifications during these hours
- `tunnel.url` — set after `cloudflared tunnel --url http://localhost:3002`
- `discord_log.enabled` — mirror signals to Discord channel for debugging

## Installation

Mac/Linux: `curl -sSL https://raw.githubusercontent.com/paperbags1103-hash/openmantis/main/install.sh | bash`
Windows: `.\install.ps1`
