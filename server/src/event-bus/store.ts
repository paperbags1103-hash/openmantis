import Database from "better-sqlite3";
import type { AgentEvent } from "../types/event.js";

export class SQLiteEventStore {
  private readonly db: Database.Database;

  constructor(filePath = "./events.db") {
    this.db = new Database(filePath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_hash ON events(hash);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);
  }

  save(event: AgentEvent, hash: string): void {
    const stmt = this.db.prepare(
      `INSERT INTO events (id, hash, type, source, timestamp, data, metadata)
       VALUES (@id, @hash, @type, @source, @timestamp, @data, @metadata)`
    );

    stmt.run({
      id: event.id,
      hash,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp,
      data: JSON.stringify(event.data),
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    });
  }

  getRecentEvents(limit = 50): AgentEvent[] {
    const stmt = this.db.prepare(
      `SELECT id, type, source, timestamp, data, metadata
       FROM events
       ORDER BY timestamp DESC
       LIMIT ?`
    );

    const rows = stmt.all(limit) as Array<{
      id: string;
      type: string;
      source: string;
      timestamp: string;
      data: string;
      metadata: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      source: row.source,
      timestamp: row.timestamp,
      data: JSON.parse(row.data) as Record<string, unknown>,
      metadata: row.metadata
        ? (JSON.parse(row.metadata) as Record<string, unknown>)
        : undefined,
    }));
  }

  isDuplicate(hash: string, withinSeconds = 60): boolean {
    const sinceIso = new Date(Date.now() - withinSeconds * 1000).toISOString();

    const stmt = this.db.prepare(
      `SELECT id
       FROM events
       WHERE hash = ? AND timestamp >= ?
       LIMIT 1`
    );

    const row = stmt.get(hash, sinceIso) as { id: string } | undefined;
    return Boolean(row);
  }
}
