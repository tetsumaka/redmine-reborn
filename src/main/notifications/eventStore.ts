import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppSettings, IssueEvent } from "src/shared/types";

export function eventAccount(settings: AppSettings): string {
  return JSON.stringify([settings.redmineUrl.trim().replace(/\/+$/, ""), settings.userId.trim()]);
}

export function assertEventRange(from: number, to: number): void {
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from >= to ||
      !Number.isFinite(new Date(from).getTime()) || !Number.isFinite(new Date(to).getTime())) {
    throw new Error("Некорректный период событий");
  }
}

export class IssueEventStore {
  private db: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS issue_events (
        account TEXT NOT NULL,
        issue_id INTEGER NOT NULL,
        journal_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        comment TEXT,
        PRIMARY KEY (account, issue_id, journal_id)
      );
      CREATE INDEX IF NOT EXISTS issue_events_by_date ON issue_events
        (account, created_at DESC, journal_id DESC, issue_id DESC);
      CREATE TABLE IF NOT EXISTS event_poll_state (
        account TEXT PRIMARY KEY,
        checked_at INTEGER NOT NULL
      );
    `);
  }

  list(settings: AppSettings, from: number, to: number): IssueEvent[] {
    assertEventRange(from, to);
    const rows = this.db.prepare(`
      SELECT issue_id, journal_id, created_at, title, message, comment
      FROM issue_events WHERE account = ? AND created_at >= ? AND created_at < ?
      ORDER BY created_at DESC, journal_id DESC, issue_id DESC
    `).all(eventAccount(settings), from, to);
    return rows.map((row) => ({
      key: `${row.issue_id}:${row.journal_id}`,
      issueId: Number(row.issue_id),
      journalId: Number(row.journal_id),
      createdAt: Number(row.created_at),
      title: String(row.title),
      message: String(row.message),
      ...(row.comment === null ? {} : { comment: String(row.comment) }),
    }));
  }

  append(settings: AppSettings, events: IssueEvent[]): IssueEvent[] {
    if (!events.length) return [];
    const account = eventAccount(settings);
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO issue_events
        (account, issue_id, journal_id, created_at, title, message, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const added: IssueEvent[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const event of events) {
        const result = insert.run(account, event.issueId, event.journalId, event.createdAt, event.title, event.message, event.comment ?? null);
        if (result.changes) added.push(event);
      }
      this.db.exec("COMMIT");
      return added;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getCheckedAt(settings: AppSettings): number | null {
    const row = this.db.prepare("SELECT checked_at FROM event_poll_state WHERE account = ?").get(eventAccount(settings));
    return row ? Number(row.checked_at) : null;
  }

  setCheckedAt(settings: AppSettings, checkedAt: number): void {
    this.db.prepare(`INSERT INTO event_poll_state (account, checked_at) VALUES (?, ?)
      ON CONFLICT(account) DO UPDATE SET checked_at = MAX(checked_at, excluded.checked_at)
    `).run(eventAccount(settings), checkedAt);
  }

  close(): void {
    this.db.close();
  }
}
