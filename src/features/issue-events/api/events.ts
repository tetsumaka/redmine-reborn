import { loadAppData } from "src/entities/app-data";
import { resolveRedmineSettings } from "src/entities/redmine";
import { issueEventStorage } from "src/entities/issue-event";
import { assertEventRange } from "src/entities/issue-event";
import type { IssueEventsResult } from "src/entities/issue-event";
import { loadIssueEvents } from "../model/history";
import { issueEventsChanged } from "../model/changes";

let generation = 0;
const refreshes = new Map<string, Promise<IssueEventsResult>>();
export function cancelEventRefreshes(): void { generation++; refreshes.clear(); }

export async function getIssueEvents(from: number, to: number): Promise<IssueEventsResult> {
  assertEventRange(from, to);
  const { settings } = await loadAppData();
  return { events: await issueEventStorage.list(await resolveRedmineSettings(settings, true), from, to), errors: [] };
}
export async function refreshIssueEvents(from: number, to: number): Promise<IssueEventsResult> {
  assertEventRange(from, to);
  const current = generation;
  const { settings } = await loadAppData();
  const context = await resolveRedmineSettings(settings);
  if (current !== generation) throw new Error("Настройки событий изменились, обновите историю повторно");
  const key = JSON.stringify([context.redmineUrl, context.userId, settings.eventSources, settings.customFields, from, to]);
  const pending = refreshes.get(key);
  if (pending) return pending;
  const request = (async () => {
    const result = await loadIssueEvents(from, to, context);
    if (current !== generation) throw new Error("Настройки событий изменились, обновите историю повторно");
    if ((await issueEventStorage.append(context, result.events)).length) issueEventsChanged();
    return { events: await issueEventStorage.list(context, from, to), errors: result.errors };
  })().finally(() => { if (refreshes.get(key) === request) refreshes.delete(key); });
  refreshes.set(key, request);
  return request;
}
