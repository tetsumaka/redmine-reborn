import type { AppSettings, NotificationListenerStatus, RedmineIssueStatus } from "src/shared/types";
import {
  DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS,
  MIN_NOTIFICATION_POLL_INTERVAL_SECONDS,
  MAX_NOTIFICATION_POLL_INTERVAL_SECONDS,
} from "src/shared/constants";
import { loadNotificationIssues, loadNotificationUser, loadIssueHistory, loadIssueStatuses } from "../redmine";
import { issueNotifications } from "./events";
import type { IssueNotification } from "./types";

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
  private delivered = new Map<string, number>();
  private user: { id: number; login: string } | null = null;
  private statuses: RedmineIssueStatus[] | null = null;
  private status: NotificationListenerStatus = { enabled: false, lastCheckedAt: null, error: null };

  constructor(private show: (event: IssueNotification, redmineUrl: string) => void, startedAt = Date.now()) {
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
    const connectionChanged = this.connection !== connection;
    const enabledChanged = this.settings?.notificationsEnabled !== settings.notificationsEnabled;
    const intervalChanged = this.settings?.notificationPollIntervalSeconds !== normalized.notificationPollIntervalSeconds;
    if (!connectionChanged && !enabledChanged && !intervalChanged) return;
    const previousSettings = this.settings;
    this.settings = normalized;
    this.connection = connection;
    this.revision += 1;
    clearTimeout(this.timer);
    if (connectionChanged) {
      this.user = null;
      this.statuses = null;
    }
    if (previousSettings && (connectionChanged || enabledChanged)) {
      this.baselineAt = Math.floor(Date.now() / 1000) * 1000;
      this.checkedAt = this.baselineAt;
      this.delivered.clear();
    }
    const ready = connectionReady(settings);
    this.status = {
      enabled: settings.notificationsEnabled,
      lastCheckedAt: connectionChanged || enabledChanged ? null : this.status.lastCheckedAt,
      error: settings.notificationsEnabled && !ready ? "Сохраните URL Redmine, API-ключ, ID пользователя и сертификат в настройках Redmine." : null,
    };
    if (settings.notificationsEnabled && ready && !this.running) this.schedule(0);
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
    if (this.running || !this.settings?.notificationsEnabled || !connectionReady(this.settings)) return;
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
      const since = Math.max(this.baselineAt, this.checkedAt - OVERLAP);
      const issues = await loadNotificationIssues(settings, new Date(since).toISOString(), this.user.login);
      if (revision !== this.revision) return;
      const failures: string[] = [];
      for (const { id, watched } of issues) {
        let issue;
        try {
          issue = await loadIssueHistory(id, settings);
        } catch (error) {
          if (revision !== this.revision) return;
          failures.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
        if (revision !== this.revision) return;
        for (const event of issueNotifications(issue, this.user, this.statuses, since, watched)) {
          if (this.delivered.has(event.key)) continue;
          this.show(event, settings.redmineUrl);
          this.delivered.set(event.key, event.createdAt);
        }
      }
      if (failures.length) throw new Error(`Не удалось проверить задачи: ${failures.join("; ")}`);
      this.checkedAt = startedAt;
      for (const [key, time] of this.delivered) {
        if (time < Math.max(this.baselineAt, this.checkedAt - OVERLAP)) this.delivered.delete(key);
      }
      this.status = { enabled: true, lastCheckedAt: new Date(startedAt).toISOString(), error: null };
    } catch (error) {
      if (revision === this.revision) {
        this.status.error = error instanceof Error ? error.message : String(error);
        console.error("[notifications]", this.status.error);
      }
    } finally {
      this.running = false;
      if (this.settings?.notificationsEnabled && connectionReady(this.settings)) {
        this.schedule(revision === this.revision ? this.settings.notificationPollIntervalSeconds * 1000 : 0);
      }
    }
  }
}
