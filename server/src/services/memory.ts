/**
 * MemoryService - 신호 요약 레이어
 *
 * SQLite events 테이블에서 오늘 발생한 신호들을 읽어서
 * 치레(AI)가 소화하기 좋은 형태로 압축해 제공.
 *
 * 추가 테이블: signal_summaries
 * - 시간대별 요약 캐시
 * - 치레가 이미 처리한 신호 추적
 */

import Database from "better-sqlite3";

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

export interface SignalGroup {
  type: string;        // 이벤트 타입 (예: "news", "price")
  source: string;      // 소스 (예: "AI News Watcher")
  count: number;       // 오늘 발생 횟수
  latest: string;      // 가장 최근 timestamp
  sample: string;      // 최신 이벤트 데이터 요약
}

export interface DailySummary {
  date: string;         // YYYY-MM-DD
  generatedAt: string;  // ISO timestamp
  groups: SignalGroup[];
  totalEvents: number;
}

// ──────────────────────────────────────────────
// 스키마
// ──────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS signal_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,           -- YYYY-MM-DD
    generated_at TEXT NOT NULL,   -- ISO timestamp
    summary_json TEXT NOT NULL,   -- JSON: DailySummary
    sent_to_chire INTEGER NOT NULL DEFAULT 0,  -- 치레에게 전달됐는지
    UNIQUE(date)
  );

  CREATE TABLE IF NOT EXISTS signal_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,       -- events.id 참조
    dispatched_at TEXT NOT NULL,  -- ISO timestamp
    rule_name TEXT NOT NULL,
    openclaw_sent INTEGER NOT NULL DEFAULT 0,
    push_sent INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_dispatches_event ON signal_dispatches(event_id);
  CREATE INDEX IF NOT EXISTS idx_summaries_date ON signal_summaries(date);
`;

// ──────────────────────────────────────────────
// MemoryService
// ──────────────────────────────────────────────

export class MemoryService {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(SCHEMA);
  }

  /**
   * 오늘의 신호 요약 텍스트를 반환.
   * 캐시가 있으면 사용, 없으면 실시간 생성.
   * 치레에게 넘기는 컨텍스트로 사용.
   */
  async getTodaySummary(): Promise<string | null> {
    const today = this.todayDate();
    const cached = this.getCachedSummary(today);

    const summary = cached ?? this.buildDailySummary(today);
    if (!summary || summary.totalEvents === 0) {
      return null;
    }

    return this.formatSummary(summary);
  }

  /**
   * 오늘 신호 요약을 직접 빌드 (캐시 없을 때)
   */
  buildDailySummary(date: string): DailySummary | null {
    // 오늘 0시 ~ 지금
    const startOfDay = `${date}T00:00:00.000Z`;
    const now = new Date().toISOString();

    const rows = this.db.prepare(`
      SELECT type, source, COUNT(*) as count,
             MAX(timestamp) as latest,
             data
      FROM events
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY type, source
      ORDER BY count DESC
    `).all(startOfDay, now) as Array<{
      type: string;
      source: string;
      count: number;
      latest: string;
      data: string;
    }>;

    if (rows.length === 0) return null;

    // 각 그룹의 최신 이벤트 샘플 가져오기
    const groups: SignalGroup[] = rows.map((row) => {
      let sample = "";
      try {
        const data = JSON.parse(row.data) as Record<string, unknown>;
        sample = this.extractSample(row.type, data);
      } catch {
        sample = "(파싱 실패)";
      }

      return {
        type: row.type,
        source: row.source,
        count: row.count,
        latest: row.latest,
        sample,
      };
    });

    const totalEvents = groups.reduce((acc, g) => acc + g.count, 0);

    const summary: DailySummary = {
      date,
      generatedAt: new Date().toISOString(),
      groups,
      totalEvents,
    };

    // 캐시 저장 (upsert)
    this.cacheSummary(date, summary);

    return summary;
  }

  /**
   * 디스패치 기록 저장 (추적용)
   */
  recordDispatch(opts: {
    eventId: string;
    ruleName: string;
    openclawSent: boolean;
    pushSent: boolean;
  }): void {
    this.db.prepare(`
      INSERT INTO signal_dispatches (event_id, dispatched_at, rule_name, openclaw_sent, push_sent)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      opts.eventId,
      new Date().toISOString(),
      opts.ruleName,
      opts.openclawSent ? 1 : 0,
      opts.pushSent ? 1 : 0,
    );
  }

  /**
   * Push 발송 기록 업데이트 (치레가 push 보낸 후 호출)
   */
  markPushSent(eventId: string): void {
    this.db.prepare(`
      UPDATE signal_dispatches SET push_sent = 1 WHERE event_id = ?
    `).run(eventId);
  }

  /**
   * 오늘 디스패치 통계
   */
  getTodayStats(): { total: number; openclawSent: number; pushSent: number } {
    const today = this.todayDate();
    const startOfDay = `${today}T00:00:00.000Z`;

    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(openclaw_sent) as openclaw_sent,
        SUM(push_sent) as push_sent
      FROM signal_dispatches
      WHERE dispatched_at >= ?
    `).get(startOfDay) as { total: number; openclaw_sent: number; push_sent: number };

    return {
      total: row.total ?? 0,
      openclawSent: row.openclaw_sent ?? 0,
      pushSent: row.push_sent ?? 0,
    };
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  private getCachedSummary(date: string): DailySummary | null {
    const row = this.db.prepare(`
      SELECT summary_json FROM signal_summaries WHERE date = ?
    `).get(date) as { summary_json: string } | undefined;

    if (!row) return null;

    try {
      const summary = JSON.parse(row.summary_json) as DailySummary;

      // 30분 이상 된 캐시는 무효화
      const age = Date.now() - new Date(summary.generatedAt).getTime();
      if (age > 30 * 60 * 1000) return null;

      return summary;
    } catch {
      return null;
    }
  }

  private cacheSummary(date: string, summary: DailySummary): void {
    this.db.prepare(`
      INSERT INTO signal_summaries (date, generated_at, summary_json)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        generated_at = excluded.generated_at,
        summary_json = excluded.summary_json
    `).run(date, summary.generatedAt, JSON.stringify(summary));
  }

  private formatSummary(summary: DailySummary): string {
    const lines: string[] = [
      `📊 **${summary.date} 신호 현황** (총 ${summary.totalEvents}건)`,
      "",
    ];

    for (const group of summary.groups) {
      const time = new Date(group.latest).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Seoul",
      });
      lines.push(`- **[${group.type}]** ${group.source} · ${group.count}건 · 최근 ${time}`);
      if (group.sample) {
        lines.push(`  > ${group.sample}`);
      }
    }

    return lines.join("\n");
  }

  private extractSample(type: string, data: Record<string, unknown>): string {
    // 이벤트 타입별 핵심 정보 추출
    switch (type) {
      case "news": {
        const title = data.title as string | undefined;
        const source = data.feed_name as string | undefined;
        return [title, source].filter(Boolean).join(" — ").slice(0, 100);
      }
      case "price_change": {
        const symbol = data.symbol as string | undefined;
        const pct = data.change_pct as number | undefined;
        return symbol && pct !== undefined
          ? `${symbol} ${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`
          : JSON.stringify(data).slice(0, 100);
      }
      case "web_change": {
        const url = data.url as string | undefined;
        return url ? `변경 감지: ${url}` : "(웹 변경)";
      }
      default:
        return JSON.stringify(data).slice(0, 120);
    }
  }

  private todayDate(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    // sv-SE locale → YYYY-MM-DD 포맷 반환
  }
}
