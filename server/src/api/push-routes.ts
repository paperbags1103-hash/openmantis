import { Router, Request, Response } from 'express';
import { z } from 'zod';

const PushSchema = z.object({
  message: z.string().min(1).max(500),
  title: z.string().optional().default('ClaWire'),
  data: z.record(z.unknown()).optional(),
});

function isLoopback(req: Request): boolean {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  return ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:127.');
}

export function createPushRouter(pushToken: string | undefined): Router {
  const router = Router();

  router.post('/api/push', async (req: Request, res: Response) => {
    if (!isLoopback(req)) {
      return res.status(403).json({ ok: false, error: 'Local access only' });
    }
    const parsed = PushSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    if (!pushToken) {
      return res.status(503).json({ ok: false, error: 'Push token not configured' });
    }
    const { message, title, data } = parsed.data;
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body: message, data: data ?? {}, sound: 'default' }),
    });
    const result = await resp.json();
    return res.json({ ok: true, expo: result });
  });

  return router;
}
