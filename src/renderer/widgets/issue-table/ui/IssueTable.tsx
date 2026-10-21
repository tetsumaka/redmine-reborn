import { useId, type ReactNode } from "react";
import { Settings } from "lucide-react";
import type { IssueDisplayColumn, IssueTableColumn, RedmineIssue } from "src/shared/types";
import { ISSUE_TABLE_COLUMN_OPTIONS } from "src/shared/issueTableColumns";
import { Table } from "src/renderer/shared/ui/Table";
import { Badge } from "src/renderer/shared/ui/Badge";
import { Button } from "src/renderer/shared/ui/Button";
import { IssueTableCell } from "./IssueTableCell";

type IssueTableProps = {
  title: string;
  description: string;
  issues: RedmineIssue[];
  redmineUrl: string;
  loading: boolean;
  error: string | null;
  configured: boolean;
  compact?: boolean;
  columns: readonly IssueDisplayColumn[];
  onConfigureColumns?: () => void;
  totalCount?: number;
  actions?: ReactNode;
  footer?: ReactNode;
  groupBy?: IssueTableColumn;
};

export function IssueTable({
  title,
  description,
  issues,
  redmineUrl,
  loading,
  error,
  configured,
  compact = false,
  columns,
  onConfigureColumns,
  totalCount = issues.length,
  actions,
  footer,
  groupBy,
}: IssueTableProps) {
  const headingId = useId();
  const groupValue = (issue: RedmineIssue) => {
    if (!groupBy) return "";
    const value = issue[groupBy];
    if (["createdOn", "updatedOn", "closedOn"].includes(groupBy)) return String(value ?? "").slice(0, 10);
    return value === null || value === "" ? "—" : String(value);
  };
  return (
    <section aria-labelledby={headingId} aria-busy={loading} className="flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {!loading && !error && configured && (
              <Badge color="blue">{totalCount}</Badge>
            )}
            <h2 id={headingId} className="min-w-0 break-words text-base font-extrabold text-zinc-100">{title}</h2>
          </div>
          {description && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400 [overflow-wrap:anywhere]">{description}</p>}
        </div>
        {actions}
        {onConfigureColumns && <Button
          icon={<Settings size={16} />}
          iconOnly
          ariaLabel={`Настроить колонки таблицы «${title}»`}
          ariaHasPopup="dialog"
          tooltip="Настроить колонки"
          onClick={onConfigureColumns}
        />}
      </div>
      <Table
        variant="embedded"
        minWidth={0}
        headers={[
          { key: "id", component: "Задача" },
          ...columns.map((column) => ({
            key: column,
            component: ISSUE_TABLE_COLUMN_OPTIONS.find((option) => option.value === column)?.label
              ?? issues.find((issue) => issue.customFields[column])?.customFields[column].name ?? column,
          })),
        ]}
        rows={issues.map((issue, index) => ({
          key: String(issue.id),
          component: (
            <>
            {groupBy && (index === 0 || groupValue(issue) !== groupValue(issues[index - 1])) && <tr className="bg-zinc-800/40"><td colSpan={columns.length + 1} className="px-4 py-2 text-xs font-bold text-zinc-300">{ISSUE_TABLE_COLUMN_OPTIONS.find((option) => option.value === groupBy)?.label}: {groupValue(issue)}</td></tr>}
            <tr className="transition hover:bg-zinc-800/70">
              <td className="whitespace-nowrap px-4 py-3 font-bold text-sky-300">
                <a href={`${redmineUrl.replace(/\/+$/, "")}/issues/${issue.id}`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">#{issue.id}</a>
              </td>
              {columns.map((column) => (
                <td
                  key={column}
                  className={column === "subject" || column === "parentSubject"
                    ? `${compact ? "w-full min-w-0 [overflow-wrap:anywhere]" : "min-w-[240px]"} px-4 py-3 text-zinc-100`
                    : column === "attachments" || column === "relations" ? "min-w-[180px] px-4 py-3 text-zinc-300"
                    : "whitespace-nowrap px-4 py-3 text-zinc-300"}
                >
                  <IssueTableCell issue={issue} column={column} redmineUrl={redmineUrl} />
                </td>
              ))}
            </tr>
            </>
          ),
        }))}
        emptyState={
          <div role={error ? "alert" : "status"} className={`flex items-center px-4 py-3 text-sm ${columns.includes("priority") ? "min-h-13" : "min-h-11"} ${error ? "text-red-300" : "text-zinc-400"}`}>
            {loading ? "Загрузка задач…" : error ?? (configured ? "Задач по этому фильтру нет" : "Настройте подключение к Redmine")}
          </div>
        }
      />
      {footer}
    </section>
  );
}
