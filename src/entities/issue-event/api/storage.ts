import { database } from "src/shared/lib/indexed-db";
import type { RedmineSettings } from "src/entities/redmine/@x/issue-event";
import type { IssueEvent, StoredIssueEvent } from "../model/types";
import { assertEventRange, eventAccount } from "../lib/account";

class IssueEventStorage {
  private readonly db = database;
  async list(settings: RedmineSettings, from: number, to: number): Promise<IssueEvent[]> {
    assertEventRange(from, to);
    const account = eventAccount(settings);
    const events = await (await this.db).getAllFromIndex("events", "byAccountDate",
      IDBKeyRange.bound([account, from], [account, to], false, true)) as StoredIssueEvent[];
    return events.map(({ account: _account, ...event }) => event)
      .sort((a, b) => b.createdAt - a.createdAt || b.journalId - a.journalId || b.issueId - a.issueId);
  }

  async append(settings: RedmineSettings, events: IssueEvent[]): Promise<IssueEvent[]> {
    const tx = (await this.db).transaction("events", "readwrite");
    const account = eventAccount(settings);
    const added: IssueEvent[] = [];
    for (const event of events) {
      if (!await tx.store.getKey([account, event.issueId, event.journalId])) {
        await tx.store.add({ ...event, account });
        added.push(event);
      }
    }
    await tx.done;
    return added;
  }

  async getCheckedAt(settings: RedmineSettings): Promise<number | null> {
    return (await (await this.db).get("cursors", eventAccount(settings)))?.checkedAt ?? null;
  }

  async setCheckedAt(settings: RedmineSettings, checkedAt: number): Promise<void> {
    const tx = (await this.db).transaction("cursors", "readwrite");
    const account = eventAccount(settings);
    const current = await tx.store.get(account);
    await tx.store.put({ account, checkedAt: Math.max(current?.checkedAt ?? 0, checkedAt) });
    await tx.done;
  }

}

export const issueEventStorage = new IssueEventStorage();
