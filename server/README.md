# ClaWire Server (Phase 1-A MVP)

Minimal event-driven server for ClaWire edge events.

## Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

The API will run on `http://localhost:3000` by default.

## Endpoints

- `GET /api/health`
- `POST /api/events`

Example event payload:

```json
{
  "type": "geofence_enter",
  "source": "edge-device-001",
  "data": {
    "geofence": "company"
  }
}
```
