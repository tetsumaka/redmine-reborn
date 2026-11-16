import type { RedmineIssueStatus } from "src/entities/redmine/@x/issue-event";
import type { IssueHistory, IssueNotification } from "../model/history";
import type { AppSettings } from "src/entities/settings/@x/issue-event";

function mentionsUser(notes: string, login: string): boolean {
  const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w@])@${escaped}(?![\\w-]|\\.+[\\w-])`, "i").test(notes);
}

function statusMessage(statusId: string, statuses: RedmineIssueStatus[]): string {
  const status = statuses.find(({ id }) => id === Number(statusId));
  if (status?.is_closed) return "закрыл задачу";
  switch (status?.name.toLowerCase().replace(/[\s_-]/g, "")) {
    case "reopened": return "переоткрыл задачу";
    case "testing": return "начал тестировать вашу задачу";
    default: return status ? `изменил статус задачи на ${status.name}` : "изменил статус задачи";
  }
}

function truncate(text: string, limit: number): string {
  const characters = Array.from(text);
  return characters.length > limit ? `${characters.slice(0, limit).join("")}...` : text;
}

export function notificationSubject(subject: string): string {
  return truncate(subject, 100);
}

export function issueNotifications(
  issue: IssueHistory,
  user: { id: number; login: string },
  statuses: RedmineIssueStatus[],
  since: number,
  watched = false,
  options: { until?: number; includeOpenHistory?: boolean; settings: AppSettings },
): IssueNotification[] {
  const closedStatuses = new Set(statuses.filter((status) => status.is_closed).map((status) => status.id));
  const issueClosed = closedStatuses.has(issue.status.id);
  const notifications: IssueNotification[] = [];
  // Restore the assignee and status at each event, walking back from the current state.
  let assignee = issue.assigned_to?.id;
  const { eventSources, issueFilters } = options.settings;
  const fieldValues = new Map((issue.custom_fields ?? []).map((field) => [String(field.id), field.value]));
  const hasUser = (value: string | string[] | null | undefined) =>
    (Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,\s]+/)).includes(String(user.id));
  let statusId = issue.status.id;
  const journals = [...issue.journals].sort((a, b) =>
    Date.parse(b.created_on) - Date.parse(a.created_on) || b.id - a.id,
  );
  for (const journal of journals) {
    const assignment = journal.details.find((detail) => detail.property === "attr" && detail.name === "assigned_to_id");
    const status = journal.details.find((detail) =>
      detail.property === "attr" && detail.name === "status_id" && detail.old_value !== detail.new_value,
    );
    const closingStatus = status?.old_value && status.new_value &&
      !closedStatuses.has(Number(status.old_value)) && closedStatuses.has(Number(status.new_value))
      ? status.new_value : null;
    const createdAt = Date.parse(journal.created_on);
    if (createdAt >= since && createdAt < (options.until ?? Infinity) && journal.user.id !== user.id) {
      const messages: string[] = [];
      const assignedToMe = eventSources.assigned && assignment && Number(assignment.new_value) === user.id && Number(assignment.old_value) !== user.id;
      const roleRelated = (eventSources.qa && hasUser(fieldValues.get(issueFilters.qaFieldId))) ||
        (eventSources.codeReviewer && hasUser(fieldValues.get(issueFilters.codeReviewerFieldId)));
      const relevant = (eventSources.watched && watched) || roleRelated || (eventSources.assigned && assignee === user.id) || assignedToMe;
      const mentioned = Boolean(relevant && journal.notes && mentionsUser(journal.notes, user.login));
      const assignedBefore = assignment ? Number(assignment.old_value) : assignee;
      if (closingStatus && (relevant || (eventSources.assigned && assignedBefore === user.id))) {
        messages.push(statusMessage(closingStatus, statuses));
      } else if ((!issueClosed || options.includeOpenHistory) && !closedStatuses.has(statusId)) {
        if (assignedToMe) messages.push("назначил на вас задачу");
        if (relevant && journal.notes?.trim()) messages.push("прокомментировал задачу");
        if (mentioned) messages.push("упомянул вас в задаче");
        if (relevant && status?.new_value) messages.push(statusMessage(status.new_value, statuses));
      }
      if (messages.length) {
        notifications.push({
          key: `${issue.id}:${journal.id}`,
          issueId: issue.id,
          journalId: journal.id,
          createdAt,
          title: notificationSubject(issue.subject),
          message: `@${journal.user.name} ${messages.length > 1 ? "обновил задачу" : messages[0]}`,
          comment: journal.notes?.trim() ? truncate(journal.notes.replace(/\s+/g, " ").trim(), 200) : undefined,
        });
      }
    }
    if (assignment) assignee = Number(assignment.old_value) || undefined;
    for (const detail of journal.details) {
      if (detail.property === "cf") fieldValues.set(detail.name, detail.old_value ?? null);
    }
    if (status?.old_value) statusId = Number(status.old_value);
  }
  return notifications.reverse();
}
