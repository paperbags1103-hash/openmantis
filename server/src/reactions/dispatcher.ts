import type { MemoryService } from '../memory/service.js';
import type { AgentEvent } from '../types/event.js';
import type { Rule } from '../types/rule.js';

export interface DispatchResult {
  sent: boolean;
  pushed: boolean;
  responseText: string;
}

interface QueuedDispatch {
  rule: Rule;
  event: AgentEvent;
}

export class Dispatcher {
  private readonly queue: QueuedDispatch[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private webhookReachable: boolean | null = null;

  constructor(
    private readonly groqKey: string | undefined,
    private readonly expoPushToken: string,
    private readonly memoryService: MemoryService,
    private readonly hooksUrl: string,
    private readonly hooksToken: string
  ) {}

  async dispatch(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    void this.groqKey;
    await this.ensureWebhookReachable();
    this.queue.push({ rule, event });
    this.scheduleFlush();

    return {
      sent: true,
      pushed: Boolean(this.expoPushToken),
      responseText: 'Queued for OpenClaw',
    };
  }

  async verifyReachable(): Promise<void> {
    await this.ensureWebhookReachable();
  }

  private scheduleFlush(): void {
    if (this.queue.length >= 5) {
      this.clearFlushTimer();
      void this.flushQueue();
      return;
    }

    this.clearFlushTimer();
    this.flushTimer = setTimeout(() => {
      void this.flushQueue();
    }, 30_000);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flushQueue(): Promise<void> {
    this.clearFlushTimer();
    const jobs = this.queue.splice(0, this.queue.length);
    if (jobs.length === 0) {
      return;
    }

    try {
      await this.callOpenClaw(jobs);
    } catch (error) {
      console.error('[clawire] OpenClaw dispatch error:', error);
    }
  }

  private async ensureWebhookReachable(): Promise<void> {
    if (this.webhookReachable === true) {
      return;
    }

    try {
      await fetch(this.hooksUrl, { method: 'GET' });
      this.webhookReachable = true;
    } catch {
      this.webhookReachable = false;
      console.error(
        `⚠️  ClaWire: OpenClaw webhook unreachable at ${this.hooksUrl}. Check openclaw gateway is running.`
      );
    }
  }

  private async callOpenClaw(jobs: QueuedDispatch[]): Promise<void> {
    if (!this.hooksToken || jobs.length === 0) {
      return;
    }

    const primaryEvent = jobs[jobs.length - 1]?.event;
    if (!primaryEvent) {
      return;
    }

    const timezone = this.memoryService.getUserContext('timezone') ?? 'UTC';
    const locale = this.memoryService.getUserContext('language') ?? 'ko';
    const context = await this.memoryService.buildContext(
      primaryEvent,
      jobs.map((job) => job.event)
    );
    const rules = [...new Set(jobs.map((job) => job.rule.name))].join(', ');
    const eventLines = jobs
      .map((job) => {
        const time = new Date(job.event.timestamp).toLocaleString(locale, {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
        });

        return `- ${time} | ${job.event.type} (${job.event.source}) | ${JSON.stringify(job.event.data)}`;
      })
      .join('\n');

    const message = [
      '## ClaWire 스마트폰 신호 번들',
      '',
      `**규칙:** ${rules}`,
      `**이벤트 수:** ${jobs.length}`,
      '',
      '## 수집된 이벤트',
      eventLines,
      '',
      '## 컨텍스트',
      context,
      '',
      '---',
      '위 내용과 MEMORY.md의 정보를 종합해서 2-3문장 한국어 push 알림을 작성해줘.',
      '완성 후 아래 명령으로 발송:',
      "exec: curl -s -X POST http://localhost:3002/api/push -H 'Content-Type: application/json' -d '{\"message\":\"알림내용\",\"title\":\"ClaWire\"}'",
    ].join('\n');

    await fetch(`${this.hooksUrl}/hooks/agent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hooksToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        name: 'ClaWire',
        deliver: false,
        events: jobs.map((job) => job.event),
      }),
    });
  }
}
