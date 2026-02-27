# 🦗 OpenMantis

> **Event-Driven Agent OS for Edge Devices**
> The world changes. OpenMantis reacts.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

---

## What is OpenMantis?

Most agent systems wait for you to say something, or fire at a scheduled time.

**OpenMantis is triggered by the world itself.**

| Generation | Trigger | Example |
|---|---|---|
| 1st gen | Human speaks | OpenClaw, ChatGPT |
| 2nd gen | Clock ticks | Cron jobs, schedulers |
| **3rd gen** | **World changes** | **OpenMantis** |

Your phone is an edge device. Your office, your location, competitor prices, breaking news — all of these are events. OpenMantis watches them, judges them with AI, and acts on them — without you lifting a finger.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Edge Devices               │
│   iPhone GPS · IoT sensors · Webhooks   │
└──────────────┬──────────────────────────┘
               │ events
               ▼
┌──────────────────────────────────────────┐
│              OpenMantis Server           │
│                                          │
│  Watcher → Event Bus → Rule Engine       │
│                    ↓                     │
│            Reaction System               │
│         (LLM analysis + action)          │
└──────────────┬───────────────────────────┘
               │ push notifications
               ▼
┌──────────────────────────────────────────┐
│           Mobile App (Expo)              │
│   Feed · Approval UI · Dashboard         │
└──────────────────────────────────────────┘
```

---

## Quick Start

### Server

```bash
cd server
cp .env.example .env
# Add your GROQ_API_KEY to .env
npm install
npm run dev
```

### Test the pipeline

```bash
curl -X POST http://localhost:3002/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "geofence_enter",
    "source": "mobile/test/gps",
    "severity": "medium",
    "data": { "zone_name": "company" }
  }'
```

The server will match the `morning-briefing` rule and call the LLM to generate a briefing.

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone.

---

## How It Works

### 1. Watchers — Sensing the world

Watchers monitor data sources and emit events:

```yaml
# config/watchers/news-ai.yaml
name: "AI News"
type: news
source: newsapi
config:
  keywords: ["OpenAI", "Anthropic", "LLM"]
  poll_interval: 5m
```

### 2. Event Bus — Unified event format

Every event, whether from a phone sensor or a news API, becomes:

```json
{
  "id": "evt_001",
  "type": "geofence_enter",
  "source": "mobile/iphone/gps",
  "severity": "medium",
  "data": { "zone_name": "company" },
  "timestamp": "2026-02-27T09:00:00Z"
}
```

### 3. Rule Engine — When to act

```yaml
# config/rules/morning-briefing.yaml
name: "Morning Briefing"
trigger:
  type: simple
  condition:
    event_type: geofence_enter
    filter: "data.zone_name == 'company'"
reaction:
  agent: morning_briefing
  approval: auto
  channel: push
  promptContext: |
    The user just arrived at the office.
    Summarize today's schedule and top news.
```

### 4. Reaction System — 3 approval levels

| Level | Behavior | Use case |
|---|---|---|
| `auto` | Act immediately | Low-risk: summaries, alerts |
| `notify` | Act, then report | Medium-risk: reports, analysis |
| `confirm` | Ask first, then act | High-risk: emails, posts |

---

## Event Chain (Domino Effect)

Agent actions can trigger new events, creating autonomous chains:

```
Competitor price drop (Watcher)
  → Market analysis agent (auto)
    → "High risk" event emitted
      → Strategy report agent (notify)
        → Report sent to Slack
          → Executive summary agent (confirm)
            → Awaiting approval
```

---

## Roadmap

### Phase 1-A: Server MVP ✅
- [x] Event Bus + SQLite deduplication
- [x] YAML Rule Engine
- [x] LLM reaction (Groq / llama-3.3-70b)
- [x] REST API for edge events

### Phase 1-B: Mobile App 🔄
- [ ] Expo Push notifications
- [ ] GPS geofence detection
- [ ] Event feed UI
- [ ] Approval flow

### Phase 1-C: Expand
- [ ] NewsWatcher, PriceWatcher, WebChangeWatcher
- [ ] Compound rules (AND/OR, time windows)
- [ ] Event chains
- [ ] CLI dashboard

### Phase 2: Edge Expansion
- [ ] Raspberry Pi support
- [ ] Apple Watch integration
- [ ] On-device lightweight LLM
- [ ] Android app

---

## Tech Stack

| Layer | Tech |
|---|---|
| Server | Node.js + TypeScript + Express |
| LLM | Groq (llama-3.3-70b) — OpenAI-compatible |
| Storage | SQLite (via better-sqlite3) |
| Config | YAML |
| Mobile | React Native + Expo |
| Push | Expo Push Notifications |

---

## Contributing

OpenMantis is MIT licensed and open to contributions.

The easiest way to contribute: **build a new Watcher.**

Every Watcher just needs 4 methods:
```typescript
interface Watcher {
  start(): Promise<void>
  stop(): Promise<void>
  status(): WatcherStatus
  // emits events to the Event Bus
}
```

See `WATCHER_GUIDE.md` for details.

---

## License

MIT © 2026 OpenMantis Contributors
