import type { IssueFilter, IssueTableColumn, IssueTableColumns } from "./types";

export const ISSUE_TABLE_COLUMN_OPTIONS = [
  { value: "priority", label: "Приоритет", redmineColumn: "priority" },
  { value: "subject", label: "Название", redmineColumn: "subject" },
  { value: "assignedTo", label: "Назначена", redmineColumn: "assigned_to" },
  { value: "status", label: "Статус", redmineColumn: "status" },
  { value: "tracker", label: "Трекер", redmineColumn: "tracker" },
  { value: "project", label: "Проект", redmineColumn: "project" },
  { value: "fixedVersion", label: "Версия", redmineColumn: "fixed_version" },
  { value: "parentId", label: "Родительская задача", redmineColumn: "parent" },
  { value: "parentSubject", label: "Тема родительской задачи", redmineColumn: "parent.subject" },
  { value: "author", label: "Автор", redmineColumn: "author" },
  { value: "updatedOn", label: "Обновлено", redmineColumn: "updated_on" },
  { value: "category", label: "Категория", redmineColumn: "category" },
  { value: "startDate", label: "Дата начала", redmineColumn: "start_date" },
  { value: "dueDate", label: "Срок завершения", redmineColumn: "due_date" },
  { value: "spentHours", label: "Трудозатраты", redmineColumn: "spent_hours" },
  { value: "estimatedHours", label: "Оценка временных затрат", redmineColumn: "estimated_hours" },
  { value: "totalEstimatedHours", label: "Общая оценка временных затрат", redmineColumn: "total_estimated_hours" },
  { value: "totalSpentHours", label: "Общие трудозатраты", redmineColumn: "total_spent_hours" },
  { value: "doneRatio", label: "Готовность", redmineColumn: "done_ratio" },
  { value: "createdOn", label: "Создано", redmineColumn: "created_on" },
  { value: "closedOn", label: "Закрыта", redmineColumn: "closed_on" },
  { value: "lastUpdatedBy", label: "Последний изменивший", redmineColumn: "last_updated_by" },
  { value: "relations", label: "Связанные задачи", redmineColumn: "relations" },
  { value: "attachments", label: "Файлы", redmineColumn: "attachments" },
] as const satisfies ReadonlyArray<{ value: IssueTableColumn; label: string; redmineColumn: string }>;

const detailColumns: readonly IssueTableColumn[] = ["parentSubject", "lastUpdatedBy", "relations", "attachments"];

export function issueTableDetailsKey(columns: IssueTableColumns = {}): string {
  return Object.keys(defaults).map((filter) =>
    detailColumns.filter((column) => columns[filter as IssueFilter]?.includes(column)).join(","),
  ).join(";");
}

const defaults: Record<IssueFilter, IssueTableColumn[]> = {
  assigned: ["priority", "subject", "status", "tracker", "project"],
  watched: ["priority", "subject", "assignedTo", "status", "tracker", "project"],
  codeReview: ["priority", "subject"],
  qaResolved: ["priority", "subject"],
  qaFeedback: ["priority", "subject"],
};

export function defaultIssueTableColumns(filter: IssueFilter): IssueTableColumn[] {
  return [...defaults[filter]];
}

export function normalizeIssueTableColumns(value: unknown): IssueTableColumns {
  const result: IssueTableColumns = {};
  if (!value || typeof value !== "object") return result;
  for (const filter of Object.keys(defaults) as IssueFilter[]) {
    const columns = (value as Record<string, unknown>)[filter];
    if (!Array.isArray(columns)) continue;
    const valid = columns.filter((column): column is IssueTableColumn =>
      ISSUE_TABLE_COLUMN_OPTIONS.some((option) => option.value === column),
    );
    if (columns.length && !valid.length) continue;
    result[filter] = [...new Set(valid)];
  }
  return result;
}
