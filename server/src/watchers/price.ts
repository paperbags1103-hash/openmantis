import { randomUUID } from "node:crypto";
import type { EventBus } from "../event-bus/bus.js";
import type { Watcher, WatcherStatus } from "./base.js";

export interface PriceAsset {
  id: string;
  symbol: string;
}

export class PriceWatcher implements Watcher {
  readonly name = "price";

  private readonly lastPrices = new Map<string, number>();
  private readonly threshold: number;
  private readonly intervalMs: number;

  private running = false;
  private lastCheckAt: string | null = null;
  private errors = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly assets: PriceAsset[],
    private readonly bus: EventBus,
    thresholdPct = 2,
    pollIntervalMs = 60 * 1000
  ) {
    this.threshold = Number.isFinite(thresholdPct) ? Math.abs(thresholdPct) : 2;
    this.intervalMs = pollIntervalMs > 0 ? pollIntervalMs : 60 * 1000;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    await this.poll();

    this.timer = setInterval(() => {
      void this.poll();
    }, this.intervalMs);
  }

  stop(): void {
    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  status(): WatcherStatus {
    return {
      running: this.running,
      lastCheck: this.lastCheckAt,
      errorCount: this.errors,
    };
  }

  private async poll(): Promise<void> {
    if (!this.running || this.assets.length === 0) {
      return;
    }

    try {
      const ids = this.assets.map((asset) => asset.id).join(",");
      const url =
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}` +
        "&vs_currencies=usd&include_24hr_change=true";

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko request failed (${response.status})`);
      }

      const payload = (await response.json()) as Record<string, Record<string, number | undefined>>;

      for (const asset of this.assets) {
        const entry = payload[asset.id];
        const price = entry?.usd;

        if (typeof price !== "number" || !Number.isFinite(price)) {
          continue;
        }

        const previousPrice = this.lastPrices.get(asset.id);
        this.lastPrices.set(asset.id, price);

        if (typeof previousPrice !== "number" || previousPrice === 0) {
          continue;
        }

        const rawChangePercent = ((price - previousPrice) / previousPrice) * 100;
        if (!Number.isFinite(rawChangePercent)) {
          continue;
        }

        const absoluteChangePercent = Math.abs(rawChangePercent);
        if (absoluteChangePercent <= this.threshold) {
          continue;
        }

        await this.bus.emit({
          id: randomUUID(),
          type: "price_change",
          source: `watcher/price/${asset.id}`,
          timestamp: new Date().toISOString(),
          severity: this.severityFromChange(absoluteChangePercent),
          data: {
            assetId: asset.id,
            symbol: asset.symbol,
            price,
            previousPrice,
            changePercent: Number(rawChangePercent.toFixed(4)),
            currency: "usd",
          },
        });
      }
    } catch (error) {
      this.errors += 1;
      console.error(`[watcher:${this.name}] poll failed`, error);
    } finally {
      this.lastCheckAt = new Date().toISOString();
    }
  }

  private severityFromChange(changePercent: number): "low" | "medium" | "high" | "critical" {
    if (changePercent > 10) {
      return "critical";
    }
    if (changePercent > 5) {
      return "high";
    }
    if (changePercent >= 2) {
      return "medium";
    }
    return "low";
  }
}
