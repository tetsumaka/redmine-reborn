import type { AppSettings } from "src/entities/settings";
import { issueEventsPoller } from "./model/listener";
import { cancelEventRefreshes } from "./api/events";

let settingsKey = "";
export function configureIssueEvents(settings: AppSettings): void {
  const key = JSON.stringify([settings.redmineUrl, settings.apiKey, settings.eventSources, settings.issueFilters]);
  if (key !== settingsKey) { settingsKey = key; cancelEventRefreshes(); }
  issueEventsPoller.configure(settings);
}
export function stopIssueEvents(): void { issueEventsPoller.stop(); cancelEventRefreshes(); }
export async function getNotificationStatus() { return issueEventsPoller.getStatus(); }
export { getIssueEvents, refreshIssueEvents } from "./api/events";
export { onIssueEventsChanged } from "./model/changes";
export type { NotificationListenerStatus } from "./model/types";
