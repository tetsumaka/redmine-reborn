import type { RedmineIssueStatus } from "src/shared/types";
import type { IssueHistory, IssueNotification } from "./types";

function mentionsUser(notes: string, login: string): boolean {
  const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w@])@${escaped}(?![\\w-]|\\.+[\\w-])`, "i").test(notes);
}

function statusMessage(statusId: string, statuses: RedmineIssueStatus[]): string {
  const status = statuses.find(({ id }) => id === Number(statusId));
  switch (status?.name.toLowerCase().replace(/[\s_-]/g, "")) {
    case "reopened": return "переоткрыл задачу";
    case "closed": return "закрыл задачу";
    case "testing": return "начал тестировать вашу задачу";
    default: return "обновил статус задачи";
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
): IssueNotification[] {
  const notifications: IssueNotification[] = [];
  // Restore the assignee at each event, walking back from the current state.
  let assignee = issue.assigned_to?.id;
  const journals = [...issue.journals].sort((a, b) =>
    Date.parse(b.created_on) - Date.parse(a.created_on) || b.id - a.id,
  );
  for (const journal of journals) {
    const assignment = journal.details.find((detail) => detail.property === "attr" && detail.name === "assigned_to_id");
    const createdAt = Date.parse(journal.created_on);
    if (createdAt >= since && journal.user.id !== user.id) {
      const messages: string[] = [];
      const assignedToMe = assignment && Number(assignment.new_value) === user.id && Number(assignment.old_value) !== user.id;
      const relevant = assignee === user.id || assignedToMe;
      if (assignedToMe) messages.push("назначил на вас задачу");
      if (relevant && journal.notes?.trim()) messages.push("прокомментировал задачу");
      if (journal.notes && mentionsUser(journal.notes, user.login)) messages.push("упомянул вас в задаче");
      const status = journal.details.find((detail) =>
        detail.property === "attr" && detail.name === "status_id" && detail.old_value !== detail.new_value,
      );
      if (relevant && status?.new_value) messages.push(statusMessage(status.new_value, statuses));
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
  }
  return notifications.reverse();
}
