import { createHash } from "node:crypto";
import type { AgentEvent } from "../types/event.js";
import { SQLiteEventStore } from "./store.js";

export type EventHandler = (event: AgentEvent) => Promise<void> | void;

export class EventBus {
  private readonly handlers: EventHandler[] = [];

  constructor(private readonly store: SQLiteEventStore) {}

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  async emit(event: AgentEvent): Promise<{ accepted: boolean; duplicate: boolean }> {
    const hash = this.hashEvent(event);
    if (this.store.isDuplicate(hash, 60)) {
      return { accepted: false, duplicate: true };
    }

    this.store.save(event, hash);

    for (const handler of this.handlers) {
      await handler(event);
    }

    return { accepted: true, duplicate: false };
  }

  private hashEvent(event: AgentEvent): string {
    const payload = `${event.source}:${event.type}:${JSON.stringify(event.data)}`;
    return createHash("md5").update(payload).digest("hex");
  }
}
