import type { RedmineIssueStatus } from "src/entities/redmine/@x/issue-event";
import type { IssueHistory, IssueNotification } from "../model/history";
import type { IssueEvent } from "../model/types";
import { roleCustomField, type AppSettings } from "src/entities/settings/@x/issue-event";

function mentionsUser(notes: string, login: string): boolean {
  const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w@])@${escaped}(?![\\w-]|\\.+[\\w-])`, "i").test(notes);
}

const statusMessages: Record<string, string> = {
  new: "перевел в New задачу",
  inprogress: "приступил к выполнению задачи",
  feedback: "ожидает обратной связи в задаче",
  reopened: "переоткрыл задачу",
  codereview: "ждет code review в задаче",
  waitrelease: "перевел в Wait Release задачу",
  pending: "перевел в ожидание задачу",
  resolved: "отправил на проверку задачу",
  testing: "приступил к проверке задачи",
  closed: "закрыл задачу",
  rejected: "отклонил задачу",
  frozen: "заморозил задачу",
};

function statusMessage(statusId: string, statuses: RedmineIssueStatus[]): string {
  const status = statuses.find(({ id }) => id === Number(statusId));
  const name = status?.name.toLowerCase().replace(/[\s_-]/g, "");
  return name && Object.hasOwn(statusMessages, name) ? statusMessages[name] : "обновил задачу";
}

function truncate(text: string, limit: number): string {
  const characters = Array.from(text);
  return characters.length > limit ? `${characters.slice(0, limit).join("")}...` : text;
}

/** History keeps the task subject separately from the event description. */
export function issueNotificationContent(event: IssueEvent): { title: string; body: string } {
  return { title: `${event.message.replace(/^@/, "")} #${event.issueId}`, body: event.title };
}

export function issueNotifications(
  issue: IssueHistory,
  user: { id: number; login: string },
  statuses: RedmineIssueStatus[],
  since: number,
  watched = false,
  options: { until?: number; settings: AppSettings },
): IssueNotification[] {
  const notifications: IssueNotification[] = [];
  // Walk back from the current state to determine relevance at each journal entry.
  let assignee = issue.assigned_to?.id;
  const { eventSources } = options.settings;
  const qaId = String(roleCustomField(options.settings, "qa")?.id ?? "");
  const reviewerId = String(roleCustomField(options.settings, "codeReviewer")?.id ?? "");
  const fieldNames = new Map([
    ...options.settings.customFields.map((field) => [String(field.id), field.name] as const),
    ...(issue.custom_fields ?? []).flatMap((field) => field.name ? [[String(field.id), field.name] as const] : []),
  ]);
  const fieldValues = new Map((issue.custom_fields ?? []).map((field) => [String(field.id), field.value]));
  const hasUser = (value: string | string[] | null | undefined) =>
    (Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,\s]+/)).includes(String(user.id));
  const journals = [...issue.journals].sort((a, b) =>
    Date.parse(b.created_on) - Date.parse(a.created_on) || b.id - a.id,
  );
  for (const journal of journals) {
    const assignment = journal.details.find((detail) => detail.property === "attr" && detail.name === "assigned_to_id");
    const status = journal.details.find((detail) =>
      detail.property === "attr" && detail.name === "status_id" && detail.old_value !== detail.new_value,
    );
    const customAssignment = journal.details.find((detail) =>
      detail.property === "cf" && hasUser(detail.new_value) && !hasUser(detail.old_value),
    );
    const createdAt = Date.parse(journal.created_on);
    if (createdAt >= since && createdAt < (options.until ?? Infinity) && journal.user.id !== user.id) {
      const assignedBefore = assignment ? Number(assignment.old_value) : assignee;
      const assignedToMe = Boolean(assignment && Number(assignment.new_value) === user.id && Number(assignment.old_value) !== user.id);
      const roleRelated = (fieldId: string) => hasUser(fieldValues.get(fieldId)) || journal.details.some((detail) =>
        detail.property === "cf" && detail.name === fieldId && hasUser(detail.old_value),
      );
      const relevant = (eventSources.watched && watched)
        || (eventSources.qa && roleRelated(qaId)) || (eventSources.codeReviewer && roleRelated(reviewerId))
        || (eventSources.assigned && (assignee === user.id || assignedBefore === user.id || assignedToMe));
      if (relevant && (journal.details.length || journal.notes?.trim())) {
        let message: string;
        if (assignedToMe) message = "назначил на вас задачу";
        else if (customAssignment) message = `назначил вас ${fieldNames.get(customAssignment.name) ?? `Пользовательское поле #${customAssignment.name}`}`;
        else if (status?.new_value) message = statusMessage(status.new_value, statuses);
        else if (journal.notes?.trim()) message = mentionsUser(journal.notes, user.login) ? "упоминул вас в задаче" : "прокомментировал задачу";
        else if (journal.details.length && journal.details.every((detail) => detail.property === "attr" && detail.name === "description")) message = "обновил описание задачи";
        else if (journal.details.length && journal.details.every((detail) => detail.property === "relation")) message = "обновил связи в задаче";
        else message = "обновил задачу";
        notifications.push({
          key: `${issue.id}:${journal.id}`,
          issueId: issue.id,
          journalId: journal.id,
          createdAt,
          title: issue.subject,
          message: `${journal.user.name} ${message}`,
          comment: journal.notes?.trim() ? truncate(journal.notes.replace(/\s+/g, " ").trim(), 200) : undefined,
        });
      }
    }
    if (assignment) assignee = Number(assignment.old_value) || undefined;
    for (const detail of journal.details) {
      if (detail.property === "cf") fieldValues.set(detail.name, detail.old_value ?? null);
    }
  }
  return notifications.reverse();
}
