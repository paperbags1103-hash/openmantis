import Database from 'better-sqlite3';
import type { AgentEvent } from '../types/event.js';
import { getConfig } from '../config/loader.js';

export class MemoryService {
  constructor(private readonly db: Database.Database) {
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_context (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        source TEXT DEFAULT 'system'
      );
      CREATE TABLE IF NOT EXISTS signal_episodes (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        label TEXT,
        event_ids TEXT,
        summary TEXT
      );
    `);
    const config = getConfig();
    const seed = [
      ['timezone', config.user.timezone],
      ['language', config.user.locale],
      ['user_name', config.user.name],
    ] as const;
    const upsert = this.db.prepare(
      `INSERT OR IGNORE INTO user_context (key, value, updated_at) VALUES (?, ?, ?)`
    );
    for (const [k, v] of seed) {
      upsert.run(k, v, new Date().toISOString());
    }
  }

  async buildContext(currentEvent: AgentEvent, queuedEvents: AgentEvent[] = [currentEvent]): Promise<string> {
    const todayStart = new Date(currentEvent.timestamp);
    todayStart.setHours(0, 0, 0, 0);
    const timezone = this.getUserContext('timezone') ?? 'UTC';
    const locale = this.getUserContext('language') ?? 'ko';

    const ctx = (this.db.prepare('SELECT key, value FROM user_context').all() as Array<{ key: string; value: string }>)
      .map((r) => `- ${r.key}: ${r.value}`)
      .join('\n');

    const stats = this.db.prepare(`
      SELECT type, COUNT(*) as cnt
      FROM events
      WHERE timestamp >= ?
      GROUP BY type ORDER BY cnt DESC LIMIT 10
    `).all(todayStart.toISOString()) as Array<{ type: string; cnt: number }>;

    const total = stats.reduce((s: number, r) => s + r.cnt, 0);
    const statsStr = stats.map((r) => `  - ${r.type}: ${r.cnt}건`).join('\n');

    const recent = (this.db.prepare(`
      SELECT type, source, timestamp, data
      FROM events
      WHERE timestamp >= ?
      ORDER BY timestamp DESC LIMIT 10
    `).all(todayStart.toISOString()) as Array<{
      type: string;
      source: string;
      timestamp: string;
      data: string;
    }>)
      .map((r) => {
        const t = new Date(r.timestamp).toLocaleTimeString(locale, {
          timeZone: timezone, hour: '2-digit', minute: '2-digit'
        });
        const d = JSON.stringify(JSON.parse(r.data)).slice(0, 60);
        return `  - [${t}] ${r.type}: ${d}`;
      })
      .join('\n');

    const queued = queuedEvents
      .map((event) => `  - ${event.type} (${event.source}): ${JSON.stringify(event.data)}`)
      .join('\n');

    return [
      `**사용자 정보:**\n${ctx}`,
      `\n**오늘 신호 통계 (총 ${total}건):**\n${statsStr || '  - 없음'}`,
      `\n**이번 번들 이벤트:**\n${queued || '  - 없음'}`,
      `\n**최근 이벤트:**\n${recent || '  - 없음'}`,
    ].join('\n');
  }

  async buildDailySummary(currentEvent: AgentEvent): Promise<string> {
    return this.buildContext(currentEvent, [currentEvent]);
  }

  setUserContext(key: string, value: string, source = 'user'): void {
    this.db.prepare(`
      INSERT INTO user_context (key, value, updated_at, source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, source=excluded.source
    `).run(key, value, new Date().toISOString(), source);
  }

  getUserContext(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM user_context WHERE key=?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }
}
