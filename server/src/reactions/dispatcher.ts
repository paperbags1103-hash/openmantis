import type { AgentEvent } from '../types/event.js';
import type { Rule } from '../types/rule.js';
import { sendPush } from './push.js';
import type { MemoryService } from '../memory/service.js';

export interface DispatchResult {
  sent: boolean;
  pushed: boolean;
  responseText: string;
}

export class Dispatcher {
  constructor(
    private readonly groqApiKey: string | undefined,
    private readonly expoPushToken: string | undefined,
    private readonly memory?: MemoryService
  ) {}

  async dispatch(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    const result = await this.callGroq(rule, event);

    try {
      await this.callOpenClaw(rule, event);
    } catch (err) {
      console.error('[clawire] OpenClaw dispatch error:', err);
    }

    return result;
  }

  private async callGroq(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    if (!this.groqApiKey) {
      return { sent: false, pushed: false, responseText: 'GROQ_API_KEY not configured' };
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are Chire. Write a short, practical Korean push notification in 1-2 sentences based on the event context.',
      },
      {
        role: 'user',
        content: [
          `규칙: ${rule.name}`,
          `이벤트 타입: ${event.type}`,
          `소스: ${event.source}`,
          `시간: ${event.timestamp}`,
          `데이터: ${JSON.stringify(event.data)}`,
          `추가 컨텍스트: ${rule.reaction.promptContext}`,
        ].join('\n'),
      },
    ];

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          max_tokens: 220,
          messages,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          sent: false,
          pushed: false,
          responseText: `Groq request failed: ${response.status} ${text}`,
        };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return { sent: false, pushed: false, responseText: 'Groq returned empty content' };
      }

      if (!this.expoPushToken) {
        return { sent: true, pushed: false, responseText: content };
      }

      await sendPush(this.expoPushToken, 'ClaWire', content, {
        rule: rule.name,
        eventType: event.type,
        source: event.source,
      });

      return { sent: true, pushed: true, responseText: content };
    } catch (err) {
      return {
        sent: false,
        pushed: false,
        responseText: `Groq dispatch error: ${(err as Error).message}`,
      };
    }
  }

  private async callOpenClaw(rule: Rule, event: AgentEvent): Promise<void> {
    const token = process.env.OPENCLAW_HOOKS_TOKEN;
    const baseUrl = process.env.OPENCLAW_HOOKS_URL ?? 'http://127.0.0.1:18789';
    if (!token || !this.memory) return;

    const context = await this.memory.buildDailySummary(event);
    const time = new Date(event.timestamp).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines = [
      '## ClaWire 스마트폰 신호 이벤트',
      '',
      `**규칙:** ${rule.name}`,
      `**시각:** ${time}`,
      `**신호:** ${event.type} (${event.source})`,
      `**데이터:** ${JSON.stringify(event.data)}`,
      '',
      '## 오늘의 신호 요약',
      context,
      '',
      '---',
      '위 내용과 MEMORY.md의 아부지 정보를 종합해서 2-3문장 한국어 push 알림을 작성해줘.',
      '완성 후 아래 명령으로 발송:',
      "exec: curl -s -X POST http://localhost:3002/api/push -H 'Content-Type: application/json' -d '{\"message\":\"알림내용\",\"title\":\"ClaWire\"}'",
    ];

    await fetch(`${baseUrl}/hooks/agent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lines.join('\n'), name: 'ClaWire', deliver: false }),
    }).catch((err) => console.error('[clawire] OpenClaw webhook error:', err));
  }
}
