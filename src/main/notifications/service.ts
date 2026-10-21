import type { AppSettings, IssueEventsResult } from "src/shared/types";
import { IssueEventStore, assertEventRange } from "./eventStore";
import { loadIssueEvents } from "./history";

export class IssueEventsService {
  private refreshes = new Map<string, Promise<IssueEventsResult>>();

  constructor(private store: IssueEventStore, private changed: () => void) {}

  list(settings: AppSettings, from: number, to: number): IssueEventsResult {
    return { events: this.store.list(settings, from, to), errors: [] };
  }

  refresh(settings: AppSettings, from: number, to: number): Promise<IssueEventsResult> {
    assertEventRange(from, to);
    const key = JSON.stringify([settings.redmineUrl, settings.userId, settings.apiKey, settings.certificatePath, from, to]);
    const pending = this.refreshes.get(key);
    if (pending) return pending;
    const request = this.fetch(settings, from, to).finally(() => this.refreshes.delete(key));
    this.refreshes.set(key, request);
    return request;
  }

  private async fetch(settings: AppSettings, from: number, to: number): Promise<IssueEventsResult> {
    const result = await loadIssueEvents(from, to, settings);
    if (this.store.append(settings, result.events).length) this.changed();
    return { events: this.store.list(settings, from, to), errors: result.errors };
  }
}
