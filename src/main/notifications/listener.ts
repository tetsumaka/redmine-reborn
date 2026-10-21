import type { AppSettings, NotificationListenerStatus, RedmineIssueStatus } from "src/shared/types";
import {
  DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS,
  MIN_NOTIFICATION_POLL_INTERVAL_SECONDS,
  MAX_NOTIFICATION_POLL_INTERVAL_SECONDS,
} from "src/shared/constants";
import { loadNotificationIssues, loadNotificationUser, loadIssueHistory, loadIssueStatuses } from "../redmine";
import { issueNotifications } from "./events";
import type { IssueNotification } from "./types";
import type { IssueEventStore } from "./eventStore";

const OVERLAP = 10_000;

function connectionReady(settings: AppSettings): boolean {
  return Boolean(settings.redmineUrl && settings.apiKey && /^\d+$/.test(settings.userId) && settings.certificatePath);
}

export class IssueNotificationListener {
  private settings: AppSettings | null = null;
  private connection = "";
  private revision = 0;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private baselineAt: number;
  private checkedAt: number;
  private user: { id: number; login: string } | null = null;
  private statuses: RedmineIssueStatus[] | null = null;
  private status: NotificationListenerStatus = { enabled: false, lastCheckedAt: null, error: null };

  constructor(
    private show: (event: IssueNotification, redmineUrl: string) => void,
    private store: IssueEventStore,
    private changed: () => void,
    startedAt = Date.now(),
  ) {
    this.baselineAt = Math.floor(startedAt / 1000) * 1000;
    this.checkedAt = this.baselineAt;
  }

  getStatus(): NotificationListenerStatus {
    return { ...this.status };
  }

  configure(settings: AppSettings): void {
    const interval = settings.notificationPollIntervalSeconds;
    const normalized = {
      ...settings,
      notificationPollIntervalSeconds: Number.isInteger(interval) && interval >= MIN_NOTIFICATION_POLL_INTERVAL_SECONDS && interval <= MAX_NOTIFICATION_POLL_INTERVAL_SECONDS
        ? interval : DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS,
    };
    const connection = JSON.stringify([settings.redmineUrl, settings.apiKey, settings.userId, settings.certificatePath]);
    const previous = this.settings;
    const connectionChanged = this.connection !== connection;
    const pollingChanged = previous?.eventsPollingEnabled !== settings.eventsPollingEnabled;
    const pushChanged = previous?.notificationsEnabled !== settings.notificationsEnabled;
    const intervalChanged = previous?.notificationPollIntervalSeconds !== normalized.notificationPollIntervalSeconds;
    this.settings = normalized;
    if (!connectionChanged && !pollingChanged && !pushChanged && !intervalChanged) return;
    this.connection = connection;
    if (connectionChanged || pollingChanged) {
      this.revision += 1;
      clearTimeout(this.timer);
      if (connectionChanged) { this.user = null; this.statuses = null; }
      if (previous) this.baselineAt = Math.floor(Date.now() / 1000) * 1000;
      this.checkedAt = Math.min(this.store.getCheckedAt(settings) ?? this.baselineAt, Date.now());
    } else if (pushChanged && settings.notificationsEnabled) {
      // Enabling push must not show older events collected while it was disabled.
      this.baselineAt = Math.floor(Date.now() / 1000) * 1000;
    }
    const ready = connectionReady(settings);
    this.status = {
      enabled: settings.eventsPollingEnabled,
      lastCheckedAt: connectionChanged ? null : this.status.lastCheckedAt,
      error: !settings.eventsPollingEnabled ? null : !ready
        ? "Сохраните URL Redmine, API-ключ, ID пользователя и сертификат в настройках Redmine." : this.status.error,
    };
    if (ready && (connectionChanged || pollingChanged)) this.status.error = null;
    if (settings.eventsPollingEnabled && ready && !this.running) {
      if (connectionChanged || pollingChanged) this.schedule(0);
      else if (intervalChanged) { clearTimeout(this.timer); this.schedule(normalized.notificationPollIntervalSeconds * 1000); }
    }
  }

  stop(): void {
    this.revision += 1;
    this.settings = null;
    clearTimeout(this.timer);
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => { void this.tick(); }, delay);
  }

  private async tick(): Promise<void> {
    if (this.running || !this.settings?.eventsPollingEnabled || !connectionReady(this.settings)) return;
    this.running = true;
    const revision = this.revision;
    const settings = this.settings;
    try {
      const startedAt = Date.now();
      if (!this.user || !this.statuses) {
        const [user, statuses] = await Promise.all([loadNotificationUser(settings), loadIssueStatuses(settings)]);
        if (revision !== this.revision) return;
        this.user = user;
        this.statuses = statuses;
      }
      const since = Math.max(0, this.checkedAt - OVERLAP);
      const issues = await loadNotificationIssues(settings, new Date(since).toISOString(), this.user.login);
      if (revision !== this.revision) return;
      const failures: string[] = [];
      const events: IssueNotification[] = [];
      for (const { id, watched } of issues) {
        try {
          const issue = await loadIssueHistory(id, settings);
          if (revision !== this.revision) return;
          events.push(...issueNotifications(issue, this.user, this.statuses, since, watched, { includeOpenHistory: true })
            .map((event) => ({ ...event, title: issue.subject })));
        } catch (error) {
          if (revision !== this.revision) return;
          failures.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      const added = this.store.append(settings, events);
      if (added.length) this.changed();
      for (const event of added) {
        if (this.settings?.notificationsEnabled && event.createdAt >= this.baselineAt) this.show(event, settings.redmineUrl);
      }
      // Keep the previous cursor on partial failure so failed tasks are retried.
      if (failures.length) throw new Error(`Не удалось проверить задачи: ${failures.join("; ")}`);
      this.store.setCheckedAt(settings, startedAt);
      this.checkedAt = startedAt;
      this.status = { enabled: true, lastCheckedAt: new Date(startedAt).toISOString(), error: null };
    } catch (error) {
      if (revision === this.revision) {
        this.status.error = error instanceof Error ? error.message : String(error);
        console.error("[events]", this.status.error);
      }
    } finally {
      this.running = false;
      if (this.settings?.eventsPollingEnabled && connectionReady(this.settings)) {
        this.schedule(revision === this.revision ? this.settings.notificationPollIntervalSeconds * 1000 : 0);
      }
    }
  }
}
