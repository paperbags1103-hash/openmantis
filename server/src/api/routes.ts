import { Router } from 'express';
import { z } from 'zod';
import { normalizeEvent } from '../event-bus/normalizer.js';
import type { EventBus } from '../event-bus/bus.js';
import type { SQLiteEventStore } from '../event-bus/store.js';
import type { MemoryService } from '../memory/service.js';
import { createVoiceRouter } from './voice-routes.js';
import { createPushRouter } from './push-routes.js';

const InboundEventSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  severity: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function createRoutes(
  eventBus: EventBus,
  store: SQLiteEventStore,
  _memoryService?: MemoryService
): Router {
  const router = Router();
  router.use(createVoiceRouter());
  router.use(createPushRouter(process.env.EXPO_PUSH_TOKEN));

  router.get('/api/health', (_req, res) => {
    res.json({ ok: true, version: '0.2.0' });
  });

  router.get('/api/events/recent', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const events = store.getRecentEvents(limit);
    res.json({ ok: true, count: events.length, events });
  });

  router.post('/api/events', async (req, res) => {
    const parsed = InboundEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid event payload',
        details: parsed.error.flatten(),
      });
    }

    const event = normalizeEvent(parsed.data);
    const result = await eventBus.emit(event);

    if (result.duplicate) {
      return res.status(202).json({ ok: true, duplicate: true, eventId: event.id });
    }

    return res.status(201).json({ ok: true, duplicate: false, eventId: event.id });
  });

  return router;
}
