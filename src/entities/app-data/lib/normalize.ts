import type { AppData } from "src/entities/app-data/model/types";
import type { AppSettings } from "src/entities/settings/@x/app-data";
import type { TimeEntry } from "src/entities/time-entry/@x/app-data";
import { defaultSettings } from "src/entities/settings/@x/app-data";
import { normalizeActivities, findActivity, normalizeCustomFields } from "src/entities/settings/@x/app-data";
import { MAX_NOTIFICATION_POLL_INTERVAL_SECONDS, MIN_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/config/domain";
import { normalizeCustomFilters } from "src/entities/issue-filter/@x/app-data";

export function emptyData(): AppData {
  return { entries: [], customFilters: [], settings: structuredClone(defaultSettings) };
}

export function validateSettings(settings: AppSettings): void {
  if (settings.redmineUrl) {
    const url = new URL(settings.redmineUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
      throw new Error("Для Redmine требуется HTTPS с доверенным сертификатом");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("Укажите базовый URL Redmine без логина, параметров и фрагмента");
    }
  }
  if (!settings.eventSources || Object.values(settings.eventSources).some((enabled) => typeof enabled !== "boolean")) {
    throw new Error("Некорректные фильтры событий");
  }
  if (typeof settings.eventsPollingEnabled !== "boolean" || typeof settings.notificationsEnabled !== "boolean") {
    throw new Error("Некорректные настройки событий");
  }
  normalizeActivities(settings.activities);
  normalizeCustomFields(settings.customFields);
  const interval = settings.notificationPollIntervalSeconds;
  if (!Number.isInteger(interval) || interval < MIN_NOTIFICATION_POLL_INTERVAL_SECONDS || interval > MAX_NOTIFICATION_POLL_INTERVAL_SECONDS) {
    throw new Error(`Интервал проверки должен быть от ${MIN_NOTIFICATION_POLL_INTERVAL_SECONDS} до ${MAX_NOTIFICATION_POLL_INTERVAL_SECONDS} секунд`);
  }
}

/** Also accepts the old desktop data.json. Desktop-only fields are discarded. */
export function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") throw new Error("Некорректный файл данных");
  const raw = value as Partial<AppData>;
  if (!Array.isArray(raw.entries) || !raw.settings || typeof raw.settings !== "object") {
    throw new Error("Файл должен содержать entries и settings");
  }
  const legacyFields = (raw.settings as { issueFilters?: { codeReviewerFieldId?: string; qaFieldId?: string } }).issueFilters;
  const settings: AppSettings = {
    redmineUrl: String(raw.settings.redmineUrl ?? "").trim(),
    apiKey: String(raw.settings.apiKey ?? "").trim(),
    eventSources: {
      assigned: raw.settings.eventSources?.assigned ?? true,
      qa: raw.settings.eventSources?.qa ?? true,
      codeReviewer: raw.settings.eventSources?.codeReviewer ?? true,
      watched: raw.settings.eventSources?.watched ?? true,
    },
    activities: normalizeActivities(raw.settings.activities ?? Object.entries(
      (raw.settings as AppSettings & { activityIds?: Record<string, number> }).activityIds ?? {},
    ).map(([name, id]) => ({ id, name: name === "CR" ? "Code Review" : name, active: true, isDefault: false }))),
    customFields: normalizeCustomFields(raw.settings.customFields ?? [
      { id: Number(legacyFields?.codeReviewerFieldId), name: "Code Reviewer" },
      { id: Number(legacyFields?.qaFieldId), name: "Quality Assurance" },
    ].filter(({ id }, index, fields) => Number.isSafeInteger(id) && id > 0 && fields.findIndex((field) => field.id === id) === index)),
    eventsPollingEnabled: raw.settings.eventsPollingEnabled ?? defaultSettings.eventsPollingEnabled,
    notificationsEnabled: raw.settings.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    notificationPollIntervalSeconds: raw.settings.notificationPollIntervalSeconds ?? defaultSettings.notificationPollIntervalSeconds,
  };
  validateSettings(settings);
  const ids = new Set<string>();
  const entries = raw.entries.map((entry): TimeEntry => {
    if (!entry || typeof entry !== "object" || typeof entry.date !== "string" || !/^\d{2}\.\d{2}\.\d{4}$/.test(entry.date)) {
      throw new Error("Некорректная дата записи в файле");
    }
    const id = entry.id || crypto.randomUUID();
    if (ids.has(id)) throw new Error("В файле есть повторяющиеся ID записей");
    ids.add(id);
    const [sh, sm] = (entry.start ?? "").split(":").map(Number);
    const [eh, em] = (entry.end ?? "").split(":").map(Number);
    const duration = entry.minutes ?? eh * 60 + em - sh * 60 - sm;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Некорректная длительность записи в файле");
    return {
      id, date: entry.date, issueId: String(entry.issueId ?? ""),
      minutes: Math.round(duration), start: entry.start, end: entry.end,
      tracker: entry.tracker ?? "Feature", subject: String(entry.subject ?? ""),
      estimatedHours: entry.estimatedHours,
      activity: (entry.activity as string) === "CR" ? "Code Review" : entry.activity ?? "Code",
      activityId: Number.isSafeInteger(entry.activityId) && entry.activityId! > 0
        ? entry.activityId : findActivity(settings.activities, entry.activity ?? "Code")?.id,
      comment: String(entry.comment ?? ""), synced: Boolean(entry.synced),
      redmineTimeEntryId: entry.redmineTimeEntryId, createdAt: entry.createdAt,
    };
  });
  return { entries, settings, customFilters: normalizeCustomFilters(raw.customFilters, settings) };
}
