import { promises as fs } from "node:fs";
import https from "node:https";
import { Entry, IssueSummary, Settings } from "./types";
import { ActivityType, TrackerType } from "src/shared/types";

type HttpResponse = { status: number; text: string };

let requestSequence = 0;

type RemoteTimeEntry = {
  id: number;
  issue?: { id: number };
  activity: { id: number; name: string };
  hours: number;
  comments?: string;
  spent_on: string;
};

type IssueDetails = {
  id?: number;
  subject: string;
  estimated_hours?: number | null;
  tracker?: { name?: TrackerType };
};

function validateSettings(settings: Settings): void {
  if (!settings.redmineUrl || !settings.apiKey || !settings.userId) {
    throw new Error("Заполните URL Redmine, API-ключ и ID пользователя");
  }
  if (!/^\d+$/.test(settings.userId))
    throw new Error("ID пользователя должен состоять из цифр");
}

function apiUrl(settings: Settings, path: string): URL {
  return new URL(path, `${settings.redmineUrl.replace(/\/+$/, "")}/`);
}

function durationHours(entry: Entry): number {
  let minutes = Number.isFinite(entry.minutes)
    ? Math.round(entry.minutes ?? 0)
    : 0;
  if (minutes <= 0) {
    const [startHour, startMinute] = (entry.start ?? "").split(":").map(Number);
    const [endHour, endMinute] = (entry.end ?? "").split(":").map(Number);
    minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  }
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error("Укажите положительное время");
  return Math.round((minutes / 60) * 100) / 100;
}

function isoDate(value: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) throw new Error("Дата должна быть в формате ДД.ММ.ГГГГ");
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Redmine вернул некорректную дату: ${value}`);
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function endTime(start: string, hours: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(start);
  let startMinutes = match ? Number(match[1]) * 60 + Number(match[2]) : 9 * 60;
  const duration = Math.max(1, Math.round(hours * 60));
  if (startMinutes + duration >= 24 * 60) startMinutes = 0;
  const endMinutes = Math.min(startMinutes + duration, 24 * 60 - 1);
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

function normalizeActivityName(value: string): ActivityType {
  return value === "CR" ? "Code Review" : (value as ActivityType);
}

async function createHttpsAgent(settings: Settings): Promise<https.Agent> {
  if (!settings.certificatePath)
    throw new Error("В настройках не выбран сертификат");
  return new https.Agent({ ca: await fs.readFile(settings.certificatePath) });
}

function requestLogUrl(url: URL): string {
  return `${url.origin}${url.pathname}${url.search}`;
}

async function request(
  method: string,
  url: URL,
  settings: Settings,
  body?: string,
): Promise<HttpResponse> {
  const agent = await createHttpsAgent(settings);
  const requestId = ++requestSequence;
  const startedAt = Date.now();
  const label = requestLogUrl(url);
  console.log(`[redmine:${requestId}] -> ${method} ${label}`);
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {
      "X-Redmine-API-Key": settings.apiKey,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const outgoing = https.request(
      url,
      { agent, method, headers, timeout: 30_000 },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode ?? 0;
          const contentTypeHeader = response.headers["content-type"];
          const contentType = Array.isArray(contentTypeHeader)
            ? contentTypeHeader.join(", ")
            : contentTypeHeader;
          console.log(
            `[redmine:${requestId}] <- ${status} ${method} ${label} ${Date.now() - startedAt}ms ${Buffer.byteLength(text)}b${contentType ? ` ${contentType}` : ""}`,
          );
          resolve({ status, text });
        });
      },
    );
    outgoing.on("timeout", () =>
      outgoing.destroy(new Error("Тайм-аут соединения с Redmine")),
    );
    outgoing.on("error", (error) => {
      console.log(
        `[redmine:${requestId}] !! ${method} ${label} ${Date.now() - startedAt}ms ${error.message}`,
      );
      reject(error);
    });
    outgoing.end(body);
  });
}

function ensureSuccess(response: HttpResponse): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Redmine ответил ${response.status}: ${response.text.slice(0, 300)}`,
    );
  }
}

async function getJson<T>(url: URL, settings: Settings): Promise<T> {
  const response = await request("GET", url, settings);
  ensureSuccess(response);
  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new Error(`Redmine вернул не JSON: ${response.text.slice(0, 120)}`);
  }
}

function issueSummary(id: number, details: IssueDetails): IssueSummary {
  return {
    id,
    tracker: details.tracker?.name ?? "Feature",
    subject: details.subject ?? "",
    estimatedHours: Number.isFinite(details.estimated_hours)
      ? Number(details.estimated_hours)
      : undefined,
  };
}

export async function loadIssue(
  issueId: string,
  settings: Settings,
): Promise<IssueSummary> {
  validateSettings(settings);
  if (!/^\d+$/.test(issueId))
    throw new Error("Номер задачи должен состоять из цифр");
  const id = Number(issueId);
  const result = await getJson<{ issue: IssueDetails }>(
    apiUrl(settings, `issues/${id}.json`),
    settings,
  );
  return issueSummary(id, result.issue);
}

export async function deleteTimeEntry(
  id: number,
  settings: Settings,
): Promise<void> {
  validateSettings(settings);
  const response = await request(
    "DELETE",
    apiUrl(settings, `time_entries/${id}.json`),
    settings,
  );
  ensureSuccess(response);
}

export async function syncEntry(
  entry: Entry,
  settings: Settings,
): Promise<number> {
  validateSettings(settings);
  if (!/^\d+$/.test(entry.issueId))
    throw new Error("Номер задачи должен состоять из цифр");
  const activityId = settings.activityIds[entry.activity];
  if (!activityId)
    throw new Error(
      `В настройках не указан ID деятельности «${entry.activity}»`,
    );
  const url = apiUrl(settings, "time_entries.json");
  url.searchParams.set("user_id", settings.userId);
  const body = JSON.stringify({
    time_entry: {
      issue_id: Number(entry.issueId),
      spent_on: isoDate(entry.date),
      hours: durationHours(entry),
      activity_id: activityId,
      comments: entry.comment,
    },
  });
  const response = await request("POST", url, settings, body);
  ensureSuccess(response);
  const result = JSON.parse(response.text) as { time_entry?: { id?: number } };
  if (!result.time_entry?.id)
    throw new Error("Redmine не вернул ID записи времени");
  return result.time_entry.id;
}

async function loadIssueDetails(
  issueIds: number[],
  settings: Settings,
): Promise<Map<number, IssueDetails>> {
  const details = new Map<number, IssueDetails>();
  await Promise.all(
    issueIds.map(async (id) => {
      try {
        const result = await getJson<{ issue: IssueDetails }>(
          apiUrl(settings, `issues/${id}.json`),
          settings,
        );
        details.set(id, result.issue);
      } catch {
        // A time entry remains useful even when issue details are unavailable.
      }
    }),
  );
  return details;
}

export async function loadDayEntries(
  date: string,
  settings: Settings,
  existingEntries: Entry[],
): Promise<Entry[]> {
  validateSettings(settings);
  const entries: RemoteTimeEntry[] = [];
  const limit = 100;
  let offset = 0;
  let total = 0;
  const day = isoDate(date);

  do {
    const url = apiUrl(settings, "time_entries.json");
    url.searchParams.set("user_id", settings.userId);
    url.searchParams.set("from", day);
    url.searchParams.set("to", day);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const page = await getJson<{
      time_entries: RemoteTimeEntry[];
      total_count?: number;
    }>(url, settings);
    entries.push(...page.time_entries);
    total = page.total_count ?? entries.length;
    offset += page.time_entries.length;
    if (page.time_entries.length === 0) break;
  } while (offset < total);

  const issueIds = [
    ...new Set(
      entries.flatMap((entry) => (entry.issue ? [entry.issue.id] : [])),
    ),
  ];
  const issues = await loadIssueDetails(issueIds, settings);
  const existingByRemoteId = new Map(
    existingEntries.flatMap((entry) =>
      entry.redmineTimeEntryId
        ? [[entry.redmineTimeEntryId, entry] as const]
        : [],
    ),
  );
  const activityNames = new Map(
    Object.entries(settings.activityIds).map(([name, id]) => [id, name]),
  );

  return entries.map((remote) => {
    const existing = existingByRemoteId.get(remote.id);
    const issue = remote.issue ? issues.get(remote.issue.id) : undefined;
    const start = existing?.start ?? "09:00";
    return {
      id: existing?.id ?? `redmine:${remote.id}`,
      date: displayDate(remote.spent_on),
      issueId: remote.issue
        ? String(remote.issue.id)
        : (existing?.issueId ?? ""),
      start,
      end: existing?.end ?? endTime(start, remote.hours),
      minutes: Math.max(1, Math.round(remote.hours * 60)),
      tracker: issue?.tracker?.name ?? existing?.tracker ?? "Feature",
      subject: issue?.subject ?? existing?.subject ?? "",
      estimatedHours: Number.isFinite(issue?.estimated_hours)
        ? Number(issue?.estimated_hours)
        : existing?.estimatedHours,
      activity: normalizeActivityName(
        activityNames.get(remote.activity.id) ?? remote.activity.name,
      ),
      comment: remote.comments ?? "",
      synced: true,
      redmineTimeEntryId: remote.id,
    };
  });
}
