import { createHash, randomUUID } from "node:crypto";
import type { EventBus } from "../event-bus/bus.js";
import type { Watcher, WatcherStatus } from "./base.js";

export class WebChangeWatcher implements Watcher {
  readonly name: string;

  private previousHash: string | null = null;
  private readonly intervalMs: number;

  private running = false;
  private lastCheckAt: string | null = null;
  private errors = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly siteName: string,
    private readonly url: string,
    private readonly bus: EventBus,
    pollIntervalMs = 30 * 60 * 1000
  ) {
    this.name = `web-change:${siteName}`;
    this.intervalMs = pollIntervalMs > 0 ? pollIntervalMs : 30 * 60 * 1000;
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
    if (!this.running) {
      return;
    }

    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch webpage (${response.status})`);
      }

      const html = await response.text();
      const textContent = this.extractText(html);
      const currentHash = createHash("md5").update(textContent).digest("hex");

      if (!this.previousHash) {
        this.previousHash = currentHash;
        return;
      }

      if (this.previousHash === currentHash) {
        return;
      }

      const previousHash = this.previousHash;
      this.previousHash = currentHash;

      await this.bus.emit({
        id: randomUUID(),
        type: "web_change",
        source: `watcher/web/${this.siteName}`,
        timestamp: new Date().toISOString(),
        severity: "medium",
        data: {
          name: this.siteName,
          url: this.url,
          previousHash,
          currentHash,
        },
      });
    } catch (error) {
      this.errors += 1;
      console.error(`[watcher:${this.name}] poll failed`, error);
    } finally {
      this.lastCheckAt = new Date().toISOString();
    }
  }

  private extractText(html: string): string {
    return html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
  }
}
