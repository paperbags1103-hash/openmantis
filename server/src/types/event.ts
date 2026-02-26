export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  severity?: "low" | "medium" | "high" | string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
