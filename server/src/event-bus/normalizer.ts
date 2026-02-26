import { randomUUID } from "node:crypto";
import type { AgentEvent } from "../types/event.js";

export function normalizeEvent(raw: unknown): AgentEvent {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const source = typeof obj.source === "string" ? obj.source : "unknown";
  const type = typeof obj.type === "string" ? obj.type : "unknown";
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : {};
  const severity =
    typeof obj.severity === "string" ? (obj.severity as AgentEvent["severity"]) : undefined;
  const metadata =
    obj.metadata && typeof obj.metadata === "object"
      ? (obj.metadata as Record<string, unknown>)
      : undefined;

  return {
    id: randomUUID(),
    type,
    source,
    timestamp: new Date().toISOString(),
    severity,
    data,
    metadata,
  };
}
