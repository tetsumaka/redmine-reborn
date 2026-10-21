import type { IssueTableColumn, RedmineIssue } from "src/shared/types";
import { Badge, type BadgeColor } from "src/renderer/shared/ui/Badge";
import { isoToDisplayDate } from "src/renderer/shared/lib/date";

const priorityColors: Record<string, BadgeColor | undefined> = {
  P5: "neutral",
  P4: "blue",
  P3: "yellow",
  P2: "orange",
  P1: "red",
};

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

type Props = { issue: RedmineIssue; column: IssueTableColumn; redmineUrl: string };

export function IssueTableCell({ issue, column, redmineUrl }: Props) {
  const issueUrl = (id: number) => `${redmineUrl.replace(/\/+$/, "")}/issues/${id}`;
  const linkStyle = "text-sky-300 underline-offset-4 hover:underline";
  switch (column) {
    case "priority":
      return issue.priority ? <Badge color={priorityColors[issue.priority]}>{issue.priority}</Badge> : "—";
    case "parentId":
      return issue.parentId ? <a href={issueUrl(issue.parentId)} target="_blank" rel="noreferrer" className={linkStyle}>#{issue.parentId}</a> : "—";
    case "parentSubject":
      return issue.parentId && issue.parentSubject
        ? <a href={issueUrl(issue.parentId)} target="_blank" rel="noreferrer" className={linkStyle}>{issue.parentSubject}</a> : "—";
    case "relations":
      return issue.relations.length ? (
        <span className="flex flex-wrap gap-x-2 gap-y-1">
          {issue.relations.map((id) => <a key={id} href={issueUrl(id)} target="_blank" rel="noreferrer" className={linkStyle}>#{id}</a>)}
        </span>
      ) : "—";
    case "attachments":
      return issue.attachments.length ? (
        <ul className="space-y-1 [overflow-wrap:anywhere]">
          {issue.attachments.map((file) => <li key={file.id}>{file.contentUrl
            ? <a href={file.contentUrl} target="_blank" rel="noreferrer" className={linkStyle}>{file.filename}</a>
            : file.filename}</li>)}
        </ul>
      ) : "—";
    case "spentHours":
    case "estimatedHours":
    case "totalEstimatedHours":
    case "totalSpentHours": {
      const hours = issue[column];
      return hours === null ? "—" : `${hours.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ч`;
    }
    case "doneRatio":
      return issue.doneRatio === null ? "—" : `${issue.doneRatio}%`;
    case "startDate":
    case "dueDate":
      return issue[column] ? isoToDisplayDate(issue[column]) : "—";
    case "createdOn":
    case "updatedOn":
    case "closedOn": {
      const value = issue[column];
      if (!value) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
    }
    default:
      return issue[column] || "—";
  }
}
