import type { AppSettings } from "src/entities/settings";
import type { NotificationListenerStatus } from "src/features/issue-events";
import type { RedmineIssueStatus } from "src/entities/redmine";
import { loadNotificationIssues, loadNotificationUser, loadIssueHistory, loadIssueStatuses } from "src/entities/redmine";
import { issueEventStorage } from "src/entities/issue-event";
import { issueNotifications, issueNotificationContent } from "src/entities/issue-event";
import { issueEventUrl } from "src/entities/issue-event";
import { showNotification } from "src/shared/lib/notifications";
import { issueEventsChanged } from "./changes";

const OVERLAP = 10_000;
class IssueEventsPoller {
  private settings: AppSettings | null = null;
  private connection = "";
  private revision = 0;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private baselineAt = Date.now();
  private checkedAt = Date.now();
  private user: { id: number; login: string } | null = null;
  private statuses: RedmineIssueStatus[] | null = null;
  private cursorLoaded = false;
  private status: NotificationListenerStatus = { enabled: false, lastCheckedAt: null, error: null };

  getStatus(): NotificationListenerStatus { return { ...this.status }; }
  configure(settings: AppSettings): void {
    const connection = JSON.stringify([settings.redmineUrl, settings.apiKey, settings.certificate?.pem, settings.eventSources, settings.customFields]);
    const previous = this.settings;
    const reset = connection !== this.connection || previous?.eventsPollingEnabled !== settings.eventsPollingEnabled;
    const intervalChanged = previous?.notificationPollIntervalSeconds !== settings.notificationPollIntervalSeconds;
    if (reset) {
      this.revision++;
      clearTimeout(this.timer);
      this.connection = connection;
      this.user = null;
      this.statuses = null;
      this.cursorLoaded = false;
      this.baselineAt = Date.now();
      this.checkedAt = this.baselineAt;
      this.status.lastCheckedAt = null;
    } else if (!previous?.notificationsEnabled && settings.notificationsEnabled) this.baselineAt = Date.now();
    this.settings = settings;
    const ready = Boolean(settings.redmineUrl && settings.apiKey);
    this.status.enabled = settings.eventsPollingEnabled;
    if (!ready || !settings.eventsPollingEnabled || reset) {
      this.status.error = settings.eventsPollingEnabled && !ready ? "Сохраните URL Redmine и API-ключ в настройках" : null;
    }
    if (!settings.eventsPollingEnabled || !ready) { clearTimeout(this.timer); return; }
    if (!this.running && (reset || intervalChanged)) this.schedule(reset ? 0 : settings.notificationPollIntervalSeconds * 1000);
  }
  stop(): void {
    this.revision++; this.settings = null; this.connection = "";
    clearTimeout(this.timer);
  }
  private schedule(delay: number): void { clearTimeout(this.timer); this.timer = setTimeout(() => { void this.tick(); }, delay); }
  private async tick(): Promise<void> {
    if (this.running || !this.settings?.eventsPollingEnabled) return;
    const settings = this.settings;
    if (!Object.values(settings.eventSources).some(Boolean)) return;
    this.running = true;
    const revision = this.revision;
    try {
      const startedAt = Date.now();
      const user = this.user ?? await loadNotificationUser(settings);
      if (revision !== this.revision) return;
      this.user = user;
      const context = { ...settings, userId: String(user.id) };
      if (!this.cursorLoaded) {
        const checkedAt = await issueEventStorage.getCheckedAt(context);
        if (revision !== this.revision) return;
        this.checkedAt = Math.min(checkedAt ?? this.baselineAt, Date.now());
        this.cursorLoaded = true;
      }
      const statuses = this.statuses ?? await loadIssueStatuses(context);
      if (revision !== this.revision) return;
      this.statuses = statuses;
      const since = Math.max(0, this.checkedAt - OVERLAP);
      const issues = await loadNotificationIssues(context, new Date(since).toISOString());
      if (revision !== this.revision) return;
      const failures: string[] = [];
      for (const { id, watched } of issues) {
        try {
          const issue = await loadIssueHistory(id, context);
          if (revision !== this.revision) return;
          const events = issueNotifications(issue, user, statuses, since, watched, { settings });
          const added = await issueEventStorage.append(context, events);
          if (revision !== this.revision) return;
          if (added.length) issueEventsChanged();
          for (const event of added) {
            if (revision !== this.revision) return;
            if (this.settings?.notificationsEnabled && event.createdAt >= this.baselineAt) {
              await showNotification({ ...issueNotificationContent(event), tag: event.key,
                issueId: event.issueId, comment: event.comment,
                url: issueEventUrl(settings.redmineUrl, event.issueId, event.journalId) }).catch(() => {});
            }
          }
        } catch (error) {
          if (revision !== this.revision) return;
          failures.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (revision !== this.revision) return;
      if (failures.length) throw new Error(`Не удалось проверить задачи: ${failures.join("; ")}`);
      await issueEventStorage.setCheckedAt(context, startedAt);
      if (revision !== this.revision) return;
      this.checkedAt = startedAt;
      this.status = { enabled: true, lastCheckedAt: new Date(startedAt).toISOString(), error: null };
    } catch (error) {
      if (revision === this.revision) this.status.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.running = false;
      if (this.settings?.eventsPollingEnabled) this.schedule(revision === this.revision ? this.settings.notificationPollIntervalSeconds * 1000 : 0);
    }
  }
}
export const issueEventsPoller = new IssueEventsPoller();
