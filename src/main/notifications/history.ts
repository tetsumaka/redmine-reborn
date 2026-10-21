import type { AppSettings, IssueEvent, IssueEventsResult } from "src/shared/types";
import { loadIssueHistory, loadIssueStatuses, loadNotificationIssues, loadNotificationUser } from "../redmine";
import { issueNotifications } from "./events";

export async function loadIssueEvents(from: number, to: number, settings: AppSettings): Promise<IssueEventsResult> {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to ||
      !Number.isFinite(new Date(from).getTime()) || !Number.isFinite(new Date(to).getTime())) {
    throw new Error("Некорректный период событий");
  }
  const [user, statuses] = await Promise.all([
    loadNotificationUser(settings),
    loadIssueStatuses(settings),
  ]);
  // Do not limit updated_on to the end of the day: a task may have newer changes too.
  const candidates = await loadNotificationIssues(settings, new Date(from).toISOString(), user.login);
  const events = new Map<string, IssueEvent>();
  const errors: string[] = [];
  let next = 0;
  const loadNext = async () => {
    while (next < candidates.length) {
      const { id, watched } = candidates[next++];
      try {
        const issue = await loadIssueHistory(id, settings);
        for (const event of issueNotifications(issue, user, statuses, from, watched, {
          until: to,
          includeOpenHistory: true,
        })) {
          events.set(event.key, { ...event, title: issue.subject });
        }
      } catch (error) {
        errors.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, loadNext));
  return {
    events: [...events.values()].sort((a, b) =>
      b.createdAt - a.createdAt || b.journalId - a.journalId || b.issueId - a.issueId,
    ),
    errors: errors.sort(),
  };
}
