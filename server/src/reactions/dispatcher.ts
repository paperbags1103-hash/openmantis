/**
 * Dispatcher v2 - OpenClaw 플러그인 버전
 *
 * 변경 사항:
 * - Groq LLM 직접 호출 → OpenClaw /hooks/agent webhook 호출
 * - 치레(AI)가 판단 주체가 됨
 * - Push 알림은 치레가 /api/push 엔드포인트를 통해 발송
 */

import type { AgentEvent } from "../types/event.js";
import type { Rule } from "../types/rule.js";
import type { MemoryService } from "../services/memory.js";

export interface DispatchResult {
  sent: boolean;       // OpenClaw webhook 전송 성공 여부
  pushed: boolean;     // Push 알림 발송 여부 (치레가 나중에 결정)
  responseText: string;
}

export interface OpenClawWebhookPayload {
  message: string;
  name: string;
  deliver: boolean;
  channel: string;
}

export class Dispatcher {
  private readonly gatewayUrl: string;
  private readonly gatewayToken: string;
  private readonly channel: string;

  constructor(
    private readonly memoryService: MemoryService,
    options?: {
      gatewayUrl?: string;
      gatewayToken?: string;
      channel?: string;
    }
  ) {
    this.gatewayUrl = options?.gatewayUrl
      ?? process.env.OPENCLAW_GATEWAY_URL
      ?? "http://127.0.0.1:18789";
    this.gatewayToken = options?.gatewayToken
      ?? process.env.OPENCLAW_GATEWAY_TOKEN
      ?? "";
    this.channel = options?.channel
      ?? process.env.OPENCLAW_CHANNEL
      ?? "discord";
  }

  async dispatch(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    const message = await this.buildMessage(rule, event);

    const payload: OpenClawWebhookPayload = {
      message,
      name: "OpenMantis",
      deliver: true,
      channel: this.channel,
    };

    const sent = await this.callOpenClaw(payload);

    return {
      sent,
      pushed: false, // 치레가 /api/push 호출 시 true로 바뀜
      responseText: sent
        ? "Forwarded to 치레 via OpenClaw"
        : "Failed to reach OpenClaw gateway",
    };
  }

  /**
   * 치레에게 넘길 메시지 구조:
   * - 이벤트 발생 컨텍스트 (규칙 + 이벤트 원본)
   * - 오늘의 신호 요약 (MemoryService)
   * - 치레가 해야 할 행동 힌트
   */
  private async buildMessage(rule: Rule, event: AgentEvent): Promise<string> {
    const todaySummary = await this.memoryService.getTodaySummary();

    const lines: string[] = [
      `## 🦟 OpenMantis 신호 감지`,
      ``,
      `**규칙**: ${rule.name}`,
      `**이벤트 타입**: ${event.type}`,
      `**소스**: ${event.source}`,
      `**시각**: ${event.timestamp}`,
      event.severity ? `**심각도**: ${event.severity}` : "",
      ``,
      `### 이벤트 데이터`,
      "```json",
      JSON.stringify(event.data, null, 2),
      "```",
      ``,
      `### 규칙 컨텍스트`,
      `> ${rule.reaction.promptContext}`,
      ``,
    ];

    if (todaySummary) {
      lines.push(`### 오늘의 신호 요약 (컨텍스트)`);
      lines.push(todaySummary);
      lines.push(``);
    }

    lines.push(`### 요청`);
    lines.push(`이 신호에 대해 판단하고, 필요하면 폰 push 알림을 보내줘.`);
    lines.push(`Push가 필요하면: \`POST http://localhost:${process.env.PORT ?? 3002}/api/push\``);
    lines.push(`Body: \`{"title": "...", "body": "...", "data": {}}\``);

    return lines.filter(Boolean).join("\n");
  }

  private async callOpenClaw(payload: OpenClawWebhookPayload): Promise<boolean> {
    const url = `${this.gatewayUrl}/hooks/agent`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.gatewayToken}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000), // 10초 타임아웃
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error(`[dispatcher] OpenClaw 응답 오류: ${response.status} ${text}`);
        return false;
      }

      console.log(`[dispatcher] OpenClaw 전송 성공: ${response.status}`);
      return true;
    } catch (err) {
      console.error("[dispatcher] OpenClaw 연결 실패:", err);
      return false;
    }
  }
}
