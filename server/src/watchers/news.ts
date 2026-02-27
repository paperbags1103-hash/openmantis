import { randomUUID } from "node:crypto";
import type { EventBus } from "../event-bus/bus.js";
import type { Watcher, WatcherStatus } from "./base.js";

interface NewsItem {
  title: string;
  link: string;
}

export class NewsWatcher implements Watcher {
  readonly name: string;

  private readonly seenLinks = new Set<string>();
  private readonly normalizedKeywords: string[];
  private readonly intervalMs: number;

  private running = false;
  private lastCheckAt: string | null = null;
  private errors = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly feedName: string,
    private readonly feedUrl: string,
    keywords: string[],
    private readonly bus: EventBus,
    pollIntervalMs = 5 * 60 * 1000
  ) {
    this.name = `news:${feedName}`;
    this.normalizedKeywords = keywords;
    this.intervalMs = pollIntervalMs;
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
      const response = await fetch(this.feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed (${response.status})`);
      }

      const xml = await response.text();
      const items = this.parseItems(xml);

      for (const item of items) {
        if (this.seenLinks.has(item.link)) {
          continue;
        }

        const matchedKeywords = this.matchKeywords(item.title);
        this.seenLinks.add(item.link);

        if (matchedKeywords.length === 0) {
          continue;
        }

        await this.bus.emit({
          id: randomUUID(),
          type: "news_match",
          source: `watcher/news/${this.feedName}`,
          timestamp: new Date().toISOString(),
          severity: "medium",
          data: {
            title: item.title,
            link: item.link,
            keywords: matchedKeywords,
            feedName: this.feedName,
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

  private matchKeywords(title: string): string[] {
    const lowerTitle = title.toLowerCase();
    return this.normalizedKeywords.filter((keyword) =>
      lowerTitle.includes(keyword.toLowerCase())
    );
  }

  private parseItems(xml: string): NewsItem[] {
    const items: NewsItem[] = [];
    const itemMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const block = match[1];
      if (!block) {
        continue;
      }

      const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);

      const title = this.decodeXml((titleMatch?.[1] ?? "").trim());
      const link = this.decodeXml((linkMatch?.[1] ?? "").trim());

      if (!title || !link) {
        continue;
      }

      items.push({ title, link });
    }

    return items;
  }

  private decodeXml(value: string): string {
    return value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
