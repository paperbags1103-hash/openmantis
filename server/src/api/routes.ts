import { Router } from "express";
import { z } from "zod";
import { normalizeEvent } from "../event-bus/normalizer.js";
import type { EventBus } from "../event-bus/bus.js";
import type { SQLiteEventStore } from "../event-bus/store.js";
import type { MemoryService } from "../services/memory.js";
import { sendPush } from "../reactions/push.js";
import { createVoiceRouter } from "./voice-routes.js";

const InboundEventSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  severity: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Push 알림 요청 스키마
 * 치레가 POST /api/push로 호출
 */
const PushRequestSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  eventId: z.string().optional(), // 어떤 이벤트에 대한 응답인지 추적용
});

export function createRoutes(
  eventBus: EventBus,
  store: SQLiteEventStore,
  memoryService?: MemoryService
): Router {
  const router = Router();
  router.use(createVoiceRouter());

  // ────────────────────────────────────────
  // 헬스체크
  // ────────────────────────────────────────
  router.get("/api/health", (_req, res) => {
    res.json({ ok: true, version: "0.2.0" });
  });

  // ────────────────────────────────────────
  // 이벤트 조회
  // ────────────────────────────────────────
  router.get("/api/events/recent", (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const events = store.getRecentEvents(limit);
    res.json({ ok: true, count: events.length, events });
  });

  // ────────────────────────────────────────
  // 이벤트 수신 (폰 앱 → 서버)
  // ────────────────────────────────────────
  router.post("/api/events", async (req, res) => {
    const parsed = InboundEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Invalid event payload",
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

  // ────────────────────────────────────────
  // Push 알림 발송 (치레 → 서버 → 폰)
  //
  // 치레가 이벤트를 판단한 후 push가 필요하다고 판단하면
  // 이 엔드포인트를 호출한다.
  //
  // POST http://localhost:3002/api/push
  // {
  //   "title": "BTC 급등 알림",
  //   "body": "BTC가 5% 상승했습니다. 현재 $85,000",
  //   "data": { "eventId": "...", "action": "check_price" },
  //   "eventId": "evt_..."  // optional, 추적용
  // }
  // ────────────────────────────────────────
  router.post("/api/push", async (req, res) => {
    const expoPushToken = process.env.EXPO_PUSH_TOKEN;

    if (!expoPushToken) {
      return res.status(503).json({
        ok: false,
        error: "EXPO_PUSH_TOKEN not configured",
      });
    }

    const parsed = PushRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Invalid push payload",
        details: parsed.error.flatten(),
      });
    }

    const { title, body, data, eventId } = parsed.data;

    try {
      await sendPush(expoPushToken, title, body, data ?? {});

      // 메모리 서비스에 push 기록 (있을 경우)
      if (memoryService && eventId) {
        memoryService.markPushSent(eventId);
      }

      console.log(`[push] 치레 요청으로 push 발송: "${title}"`);
      return res.status(200).json({ ok: true, sent: true });
    } catch (err) {
      console.error("[push] 발송 실패:", err);
      return res.status(500).json({
        ok: false,
        error: (err as Error).message,
      });
    }
  });

  // ────────────────────────────────────────
  // 오늘의 신호 요약 조회 (치레가 컨텍스트 확인용)
  // ────────────────────────────────────────
  router.get("/api/memory/today", async (_req, res) => {
    if (!memoryService) {
      return res.status(503).json({ ok: false, error: "MemoryService not initialized" });
    }

    const summary = await memoryService.getTodaySummary();
    const stats = memoryService.getTodayStats();

    return res.json({ ok: true, summary, stats });
  });

  return router;
}
