import { promises as fs } from "node:fs";
import https from "node:https";
import { TimeEntry, IssueSummary, AppSettings } from "./types";
import { ActivityType, TrackerType } from "src/shared/types";
import type {
  IssueFilter,
  RedmineIssue,
  RedmineIssueStatus,
  RedmineProject,
  RedmineNamedItem,
  IssueTableColumn,
  CustomIssueFilter,
  IssuePage,
  IssueDisplayColumn,
} from "src/shared/types";
import { configuredStatus, issueQuery } from "./redmine/issueFilters";
import type { IssueHistory } from "./notifications/types";
import { defaultIssueTableColumns } from "src/shared/issueTableColumns";
import { customFilterColumns, customFilterUrl } from "src/shared/customIssueFilters";

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

function validateSettings(settings: AppSettings): void {
  if (!settings.redmineUrl || !settings.apiKey || !settings.userId) {
    throw new Error("Заполните URL Redmine, API-ключ и ID пользователя");
  }
  if (!/^\d+$/.test(settings.userId))
    throw new Error("ID пользователя должен состоять из цифр");
}

function apiUrl(settings: AppSettings, path: string): URL {
  return new URL(path, `${settings.redmineUrl.replace(/\/+$/, "")}/`);
}

function durationHours(entry: TimeEntry): number {
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

async function createHttpsAgent(settings: AppSettings): Promise<https.Agent> {
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
  settings: AppSettings,
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

async function getJson<T>(url: URL, settings: AppSettings): Promise<T> {
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
  settings: AppSettings,
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

export async function loadIssueStatuses(settings: AppSettings): Promise<RedmineIssueStatus[]> {
  validateSettings(settings);
  const result = await getJson<{ issue_statuses: RedmineIssueStatus[] }>(
    apiUrl(settings, "issue_statuses.json"), settings,
  );
  if (!Array.isArray(result.issue_statuses)) throw new Error("Redmine не вернул список статусов");
  return result.issue_statuses.map(({ id, name, is_closed }) => ({ id, name, is_closed }));
}

export async function loadProjects(settings: AppSettings): Promise<RedmineProject[]> {
  validateSettings(settings);
  const projects = new Map<number, RedmineProject>();
  let offset = 0;
  while (true) {
    const url = apiUrl(settings, "projects.json");
    url.search = new URLSearchParams({ include: "trackers", limit: "100", offset: String(offset) }).toString();
    const page = await getJson<{ projects: RedmineProject[]; total_count?: number }>(url, settings);
    if (!Array.isArray(page.projects)) throw new Error("Redmine не вернул список проектов");
    if (!page.projects.length) break;
    const before = projects.size;
    for (const project of page.projects) {
      projects.set(project.id, {
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        trackers: Array.isArray(project.trackers) ? project.trackers.map(({ id, name }) => ({ id, name })) : [],
      });
    }
    offset += page.projects.length;
    if (page.total_count !== undefined ? offset >= page.total_count : page.projects.length < 100) break;
    if (projects.size === before) throw new Error("Redmine повторил страницу проектов");
  }
  return [...projects.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function loadProjectCategories(projectId: number, settings: AppSettings): Promise<RedmineNamedItem[]> {
  validateSettings(settings);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new Error("Некорректный ID проекта");
  const result = await getJson<{ issue_categories: RedmineNamedItem[] }>(
    apiUrl(settings, `projects/${projectId}/issue_categories.json`), settings,
  );
  if (!Array.isArray(result.issue_categories)) throw new Error("Redmine не вернул категории проекта");
  return result.issue_categories.map(({ id, name }) => ({ id, name }));
}

export async function loadProjectVersions(projectId: number, settings: AppSettings): Promise<RedmineNamedItem[]> {
  validateSettings(settings);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new Error("Некорректный ID проекта");
  const result = await getJson<{ versions: RedmineNamedItem[] }>(
    apiUrl(settings, `projects/${projectId}/versions.json`), settings,
  );
  if (!Array.isArray(result.versions)) throw new Error("Redmine не вернул список версий проекта");
  return result.versions.map(({ id, name }) => ({ id, name }));
}

export async function loadIssuePriorities(settings: AppSettings): Promise<RedmineNamedItem[]> {
  validateSettings(settings);
  const result = await getJson<{ issue_priorities: RedmineNamedItem[] }>(apiUrl(settings, "enumerations/issue_priorities.json"), settings);
  if (!Array.isArray(result.issue_priorities)) throw new Error("Redmine не вернул список приоритетов");
  return result.issue_priorities.map(({ id, name }) => ({ id, name }));
}

export async function loadNotificationUser(settings: AppSettings): Promise<{ id: number; login: string }> {
  validateSettings(settings);
  const { user } = await getJson<{ user: { id: number; login: string } }>(apiUrl(settings, "users/current.json"), settings);
  if (!user?.id || !user.login) throw new Error("Redmine не вернул логин текущего пользователя");
  if (user.id !== Number(settings.userId)) throw new Error("ID пользователя в настройках не совпадает с владельцем API-ключа");
  return { id: user.id, login: user.login };
}

async function loadChangedIssueIds(
  settings: AppSettings,
  since: string,
  filter: Record<string, string>,
  status: "open" | "closed" = "open",
): Promise<number[]> {
  validateSettings(settings);
  const timestamp = since.replace(/\.\d{3}Z$/, "Z");
  const ids = new Set<number>();
  let offset = 0;
  while (true) {
    const url = apiUrl(settings, "issues.json");
    url.search = new URLSearchParams({
      ...filter,
      status_id: status,
      updated_on: `>=${timestamp}`,
      ...(status === "closed" ? { closed_on: `>=${timestamp}` } : {}),
      sort: "updated_on:asc,id:asc",
      limit: "100",
      offset: String(offset),
    }).toString();
    const page = await getJson<{
      issues: Array<{ id: number; assigned_to?: { id: number }; updated_on: string }>;
      total_count?: number;
    }>(url, settings);
    if (!Array.isArray(page.issues)) throw new Error("Redmine не вернул список изменённых задач");
    if (!page.issues.length) break;
    const before = ids.size;
    for (const issue of page.issues) ids.add(issue.id);
    offset += page.issues.length;
    if (page.total_count !== undefined ? offset >= page.total_count : page.issues.length < 100) break;
    if (ids.size === before) throw new Error("Redmine повторил страницу изменённых задач");
  }
  return [...ids];
}

export async function loadNotificationIssues(
  settings: AppSettings,
  since: string,
  login: string,
): Promise<Array<{ id: number; watched: boolean }>> {
  const load = async (filter: Record<string, string>) => {
    const [open, recentlyClosed] = await Promise.all([
      loadChangedIssueIds(settings, since, filter),
      loadChangedIssueIds(settings, since, filter, "closed"),
    ]);
    return [...open, ...recentlyClosed];
  };
  const [assigned, mentioned, watched] = await Promise.all([
    load({ assigned_to_id: settings.userId }),
    load({ notes: `~@${login}` }),
    load({ watcher_id: settings.userId }),
  ]);
  const watchedIds = new Set(watched);
  return [...new Set([...assigned, ...mentioned, ...watched])].map((id) => ({
    id,
    watched: watchedIds.has(id),
  }));
}

export async function loadIssueHistory(id: number, settings: AppSettings): Promise<IssueHistory> {
  validateSettings(settings);
  const url = apiUrl(settings, `issues/${id}.json`);
  url.searchParams.set("include", "journals");
  const result = await getJson<{ issue: IssueHistory }>(url, settings);
  if (result.issue?.id !== id || !Array.isArray(result.issue.journals)) {
    throw new Error(`Redmine не вернул историю задачи #${id}`);
  }
  return result.issue;
}

type RemoteIssue = {
  id: number;
  subject: string;
  project?: { name: string };
  tracker?: { name: string };
  status?: { name: string };
  priority?: { name: string };
  assigned_to?: { name: string };
  fixed_version?: { name: string };
  parent?: { id: number };
  author?: { name: string };
  category?: { name: string };
  start_date?: string | null;
  due_date?: string | null;
  created_on?: string;
  updated_on?: string;
  closed_on?: string | null;
  spent_hours?: number | null;
  estimated_hours?: number | null;
  total_estimated_hours?: number | null;
  total_spent_hours?: number | null;
  done_ratio?: number;
  relations?: Array<{ issue_id: number; issue_to_id: number }>;
  attachments?: Array<{ id: number; filename: string; content_url?: string }>;
  custom_fields?: Array<{ id: number; name: string; value: string | string[] | number | null }>;
};

async function loadRemoteIssues(settings: AppSettings, params: URLSearchParams): Promise<Map<number, RemoteIssue>> {
  const issues = new Map<number, RemoteIssue>();
  let offset = 0;
  const limit = 100;
  while (true) {
    const url = apiUrl(settings, "issues.json");
    url.search = params.toString();
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const page = await getJson<{ issues: RemoteIssue[]; total_count?: number }>(url, settings);
    if (!Array.isArray(page.issues)) throw new Error("Redmine не вернул список задач");
    if (page.issues.length === 0) break;
    const previousCount = issues.size;
    for (const issue of page.issues) issues.set(issue.id, issue);
    offset += page.issues.length;
    if (page.total_count !== undefined ? offset >= page.total_count : page.issues.length < limit) break;
    if (previousCount === issues.size) throw new Error("Redmine повторно вернул ту же страницу задач");
  }
  return issues;
}

async function loadParentSubjects(issues: Map<number, RemoteIssue>, settings: AppSettings): Promise<Map<number, string>> {
  const subjects = new Map([...issues.values()].map((issue) => [issue.id, issue.subject]));
  const missing = [...new Set([...issues.values()].flatMap((issue) => issue.parent ? [issue.parent.id] : []))]
    .filter((id) => !subjects.has(id));
  for (let offset = 0; offset < missing.length; offset += 100) {
    const parents = await loadRemoteIssues(settings, new URLSearchParams({
      issue_id: missing.slice(offset, offset + 100).join(","),
      status_id: "*",
    }));
    for (const parent of parents.values()) subjects.set(parent.id, parent.subject);
  }
  return subjects;
}

async function loadLastUpdatedUsers(ids: number[], settings: AppSettings): Promise<Map<number, string>> {
  const users = new Map<number, string>();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const history = await loadIssueHistory(id, settings);
      let latest: typeof history.journals[number] | undefined;
      for (const journal of history.journals) {
        if (!latest || journal.id > latest.id) latest = journal;
      }
      users.set(id, latest?.user?.name ?? "");
    }
  }));
  return users;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function loadIssues(
  filter: IssueFilter,
  settings: AppSettings,
  columns: readonly IssueTableColumn[] = defaultIssueTableColumns(filter),
): Promise<RedmineIssue[]> {
  validateSettings(settings);
  const statuses = configuredStatus(filter, settings) ? [] : await loadIssueStatuses(settings);
  const params = issueQuery(filter, settings, statuses);
  const include = ["attachments", "relations"].filter((column) => columns.includes(column as IssueTableColumn));
  if (include.length) params.set("include", include.join(","));
  const issues = await loadRemoteIssues(settings, params);
  return hydrateIssues(issues, settings, columns);
}

export async function loadCustomFilterIssues(
  filter: CustomIssueFilter,
  settings: AppSettings,
  offset: number,
  limit: number,
): Promise<IssuePage> {
  validateSettings(settings);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Укажите корректную страницу и количество строк от 1 до 100");
  }
  const columns = customFilterColumns(filter.conditions);
  const url = apiUrl(settings, filter.projectIdentifier
    ? `projects/${encodeURIComponent(filter.projectIdentifier)}/issues.json` : "issues.json");
  url.search = new URL(customFilterUrl(filter.projectIdentifier, filter.conditions, settings)).search;
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  const include = ["attachments", "relations"].filter((column) => columns.includes(column as IssueTableColumn));
  if (include.length) url.searchParams.set("include", include.join(","));
  const page = await getJson<{ issues: RemoteIssue[]; total_count: number }>(url, settings);
  if (!Array.isArray(page.issues) || !Number.isSafeInteger(page.total_count) || page.total_count < 0) {
    throw new Error("Redmine не вернул список задач и их общее количество");
  }
  return {
    issues: await hydrateIssues(new Map(page.issues.map((issue) => [issue.id, issue])), settings, columns),
    totalCount: page.total_count,
    offset,
    limit,
  };
}

async function hydrateIssues(
  issues: Map<number, RemoteIssue>,
  settings: AppSettings,
  columns: readonly IssueDisplayColumn[],
): Promise<RedmineIssue[]> {
  const [parentSubjects, lastUpdatedUsers] = await Promise.all([
    columns.includes("parentSubject") ? loadParentSubjects(issues, settings) : Promise.resolve(new Map<number, string>()),
    columns.includes("lastUpdatedBy") ? loadLastUpdatedUsers([...issues.keys()], settings) : Promise.resolve(new Map<number, string>()),
  ]);
  return [...issues.values()].map((issue) => ({
    id: issue.id,
    subject: issue.subject,
    project: issue.project?.name ?? "",
    tracker: issue.tracker?.name ?? "",
    status: issue.status?.name ?? "",
    priority: issue.priority?.name ?? "",
    assignedTo: issue.assigned_to?.name ?? "",
    fixedVersion: issue.fixed_version?.name ?? "",
    parentId: issue.parent?.id ?? null,
    parentSubject: issue.parent ? parentSubjects.get(issue.parent.id) ?? "" : "",
    author: issue.author?.name ?? "",
    category: issue.category?.name ?? "",
    startDate: issue.start_date ?? "",
    dueDate: issue.due_date ?? "",
    createdOn: issue.created_on ?? "",
    updatedOn: issue.updated_on ?? "",
    closedOn: issue.closed_on ?? "",
    spentHours: optionalNumber(issue.spent_hours),
    estimatedHours: optionalNumber(issue.estimated_hours),
    totalEstimatedHours: optionalNumber(issue.total_estimated_hours),
    totalSpentHours: optionalNumber(issue.total_spent_hours),
    doneRatio: optionalNumber(issue.done_ratio),
    lastUpdatedBy: lastUpdatedUsers.get(issue.id) ?? "",
    relations: [...new Set((issue.relations ?? []).flatMap((relation) =>
      relation.issue_id === issue.id ? [relation.issue_to_id]
        : relation.issue_to_id === issue.id ? [relation.issue_id] : [],
    ))].filter((id) => id !== issue.id),
    attachments: (issue.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      contentUrl: /^https?:\/\//i.test(attachment.content_url ?? "") ? attachment.content_url! : "",
    })),
    customFields: Object.fromEntries((issue.custom_fields ?? []).map((field) => [
      `cf_${field.id}`, { name: field.name, value: Array.isArray(field.value) ? field.value.join(", ") : String(field.value ?? "") },
    ])),
  }));
}

export async function deleteTimeEntry(
  id: number,
  settings: AppSettings,
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
  entry: TimeEntry,
  settings: AppSettings,
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
  settings: AppSettings,
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
  settings: AppSettings,
  existingEntries: TimeEntry[],
): Promise<TimeEntry[]> {
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
