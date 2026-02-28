import { Router } from 'express';
import { z } from 'zod';
import { normalizeEvent } from '../event-bus/normalizer.js';
import type { EventBus } from '../event-bus/bus.js';
import type { SQLiteEventStore } from '../event-bus/store.js';
import type { MemoryService } from '../memory/service.js';
import type { RuleEngine } from '../rules/engine.js';
import type { Dispatcher } from '../reactions/dispatcher.js';
import type { ClaWireConfig } from '../config/loader.js';
import { SignalThrottle } from '../services/signal-throttle.js';
import { createVoiceRouter } from './voice-routes.js';
import { createPushRouter } from './push-routes.js';
import { createSetupRouter } from './setup-routes.js';

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
  _memoryService: MemoryService,
  dispatcher: Dispatcher,
  ruleEngine: RuleEngine,
  getConfig: () => ClaWireConfig
): Router {
  const router = Router();
  const throttle = new SignalThrottle();
  router.use(createVoiceRouter());
  router.use(createPushRouter(getConfig));
  router.use(createSetupRouter(getConfig));

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

    const config = getConfig();
    const event = normalizeEvent(parsed.data);
    const result = await eventBus.emit(event, { notify: false });

    if (result.duplicate) {
      return res.status(202).json({ ok: true, duplicate: true, eventId: event.id });
    }

    const batteryLevel = typeof event.data.level === 'number' ? event.data.level : undefined;
    const isUrgentBatteryLow = event.type === 'battery_low' && batteryLevel !== undefined && batteryLevel <= 10;
    const quietHours = throttle.isQuietHours(
      config.server.quiet_hours_start,
      config.server.quiet_hours_end
    );
    const withinCooldown = !throttle.shouldAllow(event.type);

    if ((quietHours && !isUrgentBatteryLow) || withinCooldown) {
      console.log(`⏭ Skipped ${event.type} (cooldown/quiet hours)`);
      return res.status(201).json({ ok: true, duplicate: false, eventId: event.id, skipped: true });
    }

    throttle.record(event.type);
    const matches = ruleEngine.evaluate(event);
    for (const rule of matches) {
      try {
        await dispatcher.dispatch(rule, event);
      } catch (error) {
        console.error(`[reaction-error] rule=${rule.name} event=${event.id}`, error);
      }
    }

    return res.status(201).json({ ok: true, duplicate: false, eventId: event.id });
  });

  return router;
}
