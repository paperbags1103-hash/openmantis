import { randomBytes } from 'node:crypto';
import os from 'node:os';
import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import type { ClaWireConfig } from '../config/loader.js';
import { updateConfig } from '../config/loader.js';

const PairSchema = z.object({
  expo_push_token: z.string().min(1),
  setup_token: z.string().min(1),
});

function detectServerIp(): string {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }

  return '127.0.0.1';
}

export function createSetupRouter(getConfig: () => ClaWireConfig): Router {
  const router = Router();
  let activeSetupToken: string | null = null;

  router.get('/setup', async (_req, res, next) => {
    try {
      const config = getConfig();
      const baseUrl = config.tunnel.url.trim() || `http://${detectServerIp()}:${config.server.port}`;
      activeSetupToken = randomBytes(4).toString('hex');
      const payload = JSON.stringify({ url: baseUrl, token: activeSetupToken });
      const qrDataUrl = await QRCode.toDataURL(payload);

      res.type('html').send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>ClaWire Setup</title>
          </head>
          <body style="font-family: sans-serif; padding: 32px; text-align: center;">
            <h1>ClaWire Setup</h1>
            <p>Scan this with ClaWire app to connect</p>
            <img src="${qrDataUrl}" alt="ClaWire setup QR code" style="max-width: 320px; width: 100%;" />
            <p style="margin-top: 20px;">${baseUrl}</p>
          </body>
        </html>
      `);
    } catch (error) {
      next(error);
    }
  });

  router.post('/setup/pair', (req, res) => {
    const parsed = PairSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    if (!activeSetupToken || parsed.data.setup_token !== activeSetupToken) {
      return res.status(403).json({ ok: false, error: 'Invalid setup token' });
    }

    updateConfig((config) => ({
      ...config,
      push: {
        ...config.push,
        expo_token: parsed.data.expo_push_token,
      },
    }));

    activeSetupToken = null;
    return res.json({ ok: true, message: 'Paired successfully' });
  });

  return router;
}
