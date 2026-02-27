# OpenMantis Mobile (Expo)

Minimal Expo mobile app for OpenMantis.

## Features

- Sensor: GPS geofence enter/exit event posting
- Remote control: Push notification reception
- Dashboard: Recent event feed and agent status cards

## Setup

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Update `.env` if needed:

```env
SERVER_URL=http://localhost:3001
```

4. Start the app:

```bash
npm run start
```

## API assumptions

- `GET /api/events/recent`
- `POST /api/events`
- `POST /api/reactions/:id/decision`

## Notes

- Geofences are currently hardcoded in `app/(tabs)/settings.tsx` (`company`, `home`).
- Feed screen polls every 30 seconds.
