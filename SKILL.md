---
name: clawire
description: "Smartphone signal layer for OpenClaw. Receives real-world signals from iPhone (GPS, battery, calendar, motion) and asks Chire to generate personalized push notifications."
---

# ClaWire — Smartphone Signal Layer

## What is ClaWire?
ClaWire is your eyes and ears in the physical world. It runs on a home server and connects to your iPhone to collect real-world signals. When something meaningful happens, it sends a summary to you (Chire) for judgment and notification.

## When you receive a ClaWire webhook
You'll get a message starting with "## ClaWire 스마트폰 신호 이벤트"

**Your job:**
1. Read the signal type and data
2. Read the "오늘의 신호 요약" section
3. Cross-reference with your MEMORY.md knowledge of 아부지
4. Write a personalized 2-3 sentence notification in Korean
5. Send push notification:

```bash
curl -s -X POST http://localhost:3002/api/push \
  -H "Content-Type: application/json" \
  -d '{"message": "your notification here", "title": "ClaWire"}'
```

## Signal types
- **geofence_enter/exit** — location zone change (home, office, gym)
- **battery_low** — battery below threshold
- **battery_charging** — started charging (likely sitting down)
- **app_foreground/background** — phone picked up or put down
- **calendar_upcoming** — event starting in 30 min
- **wifi_connected/disconnected** — network change (location proxy)
- **motion_walking/vehicle/stationary** — activity detection
- **voice_query** — user spoke to phone

## Personalization rules
- Always use 아부지 context from MEMORY.md
- Be specific: "BTC 4.1% 올랐어요" not "가격이 올랐어요"
- Keep it short — push notifications, not essays
- Sound like Chire talking to 아부지, not a bot alert
- If battery_low + geofence_exit: "퇴근하시는 거예요? 충전기 챙기세요"
