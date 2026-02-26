import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EventBus } from "./event-bus/bus.js";
import { SQLiteEventStore } from "./event-bus/store.js";
import { RuleEngine } from "./rules/engine.js";
import { Dispatcher } from "./reactions/dispatcher.js";
import { createRoutes } from "./api/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(express.json());

  const store = new SQLiteEventStore(join(__dirname, "..", "events.db"));
  const bus = new EventBus(store);

  const ruleEngine = new RuleEngine();
  await ruleEngine.loadRules(join(__dirname, "config", "rules"));

  const dispatcher = new Dispatcher(
    process.env.ANTHROPIC_API_KEY,
    process.env.EXPO_PUSH_TOKEN
  );

  bus.subscribe(async (event) => {
    const matches = ruleEngine.evaluate(event);

    for (const rule of matches) {
      try {
        const result = await dispatcher.dispatch(rule, event);
        console.log(
          `[reaction] rule=${rule.name} event=${event.id} pushed=${result.pushed} response=${result.responseText}`
        );
      } catch (error) {
        console.error(`[reaction-error] rule=${rule.name} event=${event.id}`, error);
      }
    }
  });

  app.use(createRoutes(bus));

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`OpenMantis server listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start OpenMantis server", error);
  process.exit(1);
});
