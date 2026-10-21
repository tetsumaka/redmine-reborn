import { app } from "electron";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AppData, TimeEntry, defaultSettings } from "./types";
import { ActivityType } from "src/shared/types";
import { MIN_NOTIFICATION_POLL_INTERVAL_SECONDS, MAX_NOTIFICATION_POLL_INTERVAL_SECONDS, NOTIFICATION_POSITIONS } from "src/shared/constants";
import { normalizeIssueTableColumns } from "src/shared/issueTableColumns";

const emptyData = (): AppData => ({
  entries: [],
  customFilters: [],
  issueTableColumns: {},
  settings: {
    ...defaultSettings,
    activityIds: { ...defaultSettings.activityIds },
    issueFilters: { ...defaultSettings.issueFilters },
  },
});

function durationFromLegacyTimes(
  entry: Partial<TimeEntry>,
): number | undefined {
  const [startHour, startMinute] = (entry.start ?? "").split(":").map(Number);
  const [endHour, endMinute] = (entry.end ?? "").split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
}

function normalizeActivity(activity: string | undefined): ActivityType {
  return activity === "CR"
    ? "Code Review"
    : (activity as ActivityType) || "Code";
}

function normalizeEntry(raw: Partial<TimeEntry>): TimeEntry {
  return {
    id: raw.id || randomUUID(),
    date: raw.date || "",
    issueId: raw.issueId || "",
    start: raw.start,
    end: raw.end,
    minutes: Number.isFinite(raw.minutes)
      ? Math.max(0, Math.round(raw.minutes ?? 0))
      : durationFromLegacyTimes(raw),
    tracker: raw.tracker || "Feature",
    subject: raw.subject || "",
    estimatedHours: Number.isFinite(raw.estimatedHours)
      ? raw.estimatedHours
      : undefined,
    activity: normalizeActivity(raw.activity),
    comment: raw.comment || "",
    synced: Boolean(raw.synced),
    redmineTimeEntryId: raw.redmineTimeEntryId,
    createdAt: raw.createdAt,
  };
}

export class Store {
  private file = path.join(app.getPath("userData"), "data.json");
  private writes: Promise<void> = Promise.resolve();

  async read(): Promise<AppData> {
    try {
      const parsed = JSON.parse(
        await fs.readFile(this.file, "utf8"),
      ) as Partial<AppData>;
      const settings = parsed.settings;
      const interval = settings?.notificationPollIntervalSeconds ?? defaultSettings.notificationPollIntervalSeconds;
      const position = settings?.notificationPosition ?? defaultSettings.notificationPosition;
      const activityIds = {
        ...(settings?.activityIds ?? defaultSettings.activityIds),
      };
      if (activityIds.CR && !activityIds["Code Review"])
        activityIds["Code Review"] = activityIds.CR;
      return {
        customFilters: Array.isArray(parsed.customFilters) ? parsed.customFilters : [],
        issueTableColumns: normalizeIssueTableColumns(parsed.issueTableColumns),
        entries: Array.isArray(parsed.entries)
          ? parsed.entries.map((entry) => normalizeEntry(entry))
          : [],
        settings: {
          redmineUrl: settings?.redmineUrl ?? defaultSettings.redmineUrl,
          apiKey: settings?.apiKey ?? defaultSettings.apiKey,
          userId: settings?.userId ?? defaultSettings.userId,
          certificatePath:
            settings?.certificatePath ?? defaultSettings.certificatePath,
          activityIds,
          notificationsEnabled: settings?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
          notificationPollIntervalSeconds: Number.isInteger(interval) &&
            interval >= MIN_NOTIFICATION_POLL_INTERVAL_SECONDS && interval <= MAX_NOTIFICATION_POLL_INTERVAL_SECONDS
            ? interval : defaultSettings.notificationPollIntervalSeconds,
          notificationPosition: NOTIFICATION_POSITIONS.includes(position) ? position : defaultSettings.notificationPosition,
          issueFilters: {
            ...defaultSettings.issueFilters,
            ...settings?.issueFilters,
          },
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return emptyData();
      throw error;
    }
  }

  write(data: AppData): Promise<void> {
    const contents = JSON.stringify(data, null, 2);
    const write = this.writes.catch(() => {}).then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temporary = `${this.file}.tmp`;
      await fs.writeFile(temporary, contents, "utf8");
      await fs.rename(temporary, this.file);
    });
    this.writes = write;
    return write;
  }
}
