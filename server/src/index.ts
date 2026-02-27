import "dotenv/config";
import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import YAML from "yaml";
import { EventBus } from "./event-bus/bus.js";
import { SQLiteEventStore } from "./event-bus/store.js";
import { RuleEngine } from "./rules/engine.js";
import { Dispatcher } from "./reactions/dispatcher.js";
import { MemoryService } from "./services/memory.js";
import { createRoutes } from "./api/routes.js";
import type { Watcher } from "./watchers/base.js";
import { NewsWatcher } from "./watchers/news.js";
import { PriceWatcher } from "./watchers/price.js";
import { WebChangeWatcher } from "./watchers/web-change.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FeedWatcherConfig {
  name: string;
  url: string;
  keywords: string[];
}

interface NewsWatcherConfig {
  name: string;
  type: string;
  feeds: FeedWatcherConfig[];
  poll_interval?: string | number;
}

interface PriceAssetConfig {
  id: string;
  symbol: string;
}

interface PriceWatcherConfig {
  name: string;
  type: string;
  assets: PriceAssetConfig[];
  threshold_pct?: number;
  poll_interval?: string | number;
}

function parsePollIntervalMs(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.trim().match(/^(\d+)\s*([smh])$/i);
    const amountText = match?.[1];
    const unitText = match?.[2];
    if (amountText && unitText) {
      const amount = Number(amountText);
      const unit = unitText.toLowerCase();
      const multiplier = unit === "h" ? 60 * 60 * 1000 : unit === "m" ? 60 * 1000 : 1000;
      return amount * multiplier;
    }
  }

  return 5 * 60 * 1000;
}

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  const dbPath = join(__dirname, "..", "events.db");
  const store = new SQLiteEventStore(dbPath);
  const bus = new EventBus(store);

  // ── MemoryService 초기화 (같은 DB 파일 공유)
  const memoryService = new MemoryService(dbPath);

  const ruleEngine = new RuleEngine();
  await ruleEngine.loadRules(join(__dirname, "config", "rules"));
  const watchers: Watcher[] = [];

  if (process.env.ENABLE_WATCHERS === "true") {
    const watcherConfigPath = join(__dirname, "config", "watchers", "ai-news.yaml");
    const watcherConfigText = await readFile(watcherConfigPath, "utf8");
    const watcherConfig = YAML.parse(watcherConfigText) as NewsWatcherConfig;
    const pollIntervalMs = parsePollIntervalMs(watcherConfig.poll_interval);

    for (const feed of watcherConfig.feeds ?? []) {
      watchers.push(new NewsWatcher(feed.name, feed.url, feed.keywords, bus, pollIntervalMs));
    }

    const priceWatcherConfigPath = join(__dirname, "config", "watchers", "crypto-prices.yaml");
    const priceWatcherConfigText = await readFile(priceWatcherConfigPath, "utf8");
    const priceWatcherConfig = YAML.parse(priceWatcherConfigText) as PriceWatcherConfig;
    const pricePollIntervalMs = parsePollIntervalMs(priceWatcherConfig.poll_interval);
    const thresholdPct =
      typeof priceWatcherConfig.threshold_pct === "number"
        ? priceWatcherConfig.threshold_pct
        : undefined;

    watchers.push(
      new PriceWatcher(
        priceWatcherConfig.assets ?? [],
        bus,
        thresholdPct,
        pricePollIntervalMs
      )
    );
  }

  const webChangeName = process.env.WEB_CHANGE_NAME;
  const webChangeUrl = process.env.WEB_CHANGE_URL;
  const webChangeIntervalMs = parsePollIntervalMs(process.env.WEB_CHANGE_POLL_INTERVAL);

  if (webChangeName && webChangeUrl) {
    watchers.push(new WebChangeWatcher(webChangeName, webChangeUrl, bus, webChangeIntervalMs));
  }

  for (const watcher of watchers) {
    await watcher.start();
  }

  // ── Dispatcher v2: Groq 제거, OpenClaw webhook 사용
  const dispatcher = new Dispatcher(memoryService);

  bus.subscribe(async (event) => {
    const matches = ruleEngine.evaluate(event);

    for (const rule of matches) {
      try {
        const result = await dispatcher.dispatch(rule, event);

        // 디스패치 기록 저장
        memoryService.recordDispatch({
          eventId: event.id,
          ruleName: rule.name,
          openclawSent: result.sent,
          pushSent: result.pushed,
        });

        console.log(
          `[reaction] rule=${rule.name} event=${event.id} sent=${result.sent} pushed=${result.pushed}`
        );
      } catch (error) {
        console.error(`[reaction-error] rule=${rule.name} event=${event.id}`, error);
      }
    }
  });

  // ── 라우터: memoryService 전달 (push 엔드포인트용)
  app.use(createRoutes(bus, store, memoryService));

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => {
    console.log(`ClaWire server started (port ${port})`);
    console.log(`OpenClaw 게이트웨이: ${process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789"}`);
    console.log(`Push 엔드포인트: http://localhost:${port}/api/push`);
    console.log(`신호 요약: http://localhost:${port}/api/memory/today`);
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const watcher of watchers) {
      watcher.stop();
    }

    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start ClaWire server", error);
  process.exit(1);
});
