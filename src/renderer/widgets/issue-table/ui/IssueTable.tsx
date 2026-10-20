import { useId } from "react";
import type { RedmineIssue } from "src/shared/types";
import { Table } from "src/renderer/shared/ui/Table";

type DetailColumn = "project" | "tracker" | "status" | "priority" | "assignedTo";

const columnLabels: Record<DetailColumn, string> = {
  project: "Проект",
  tracker: "Трекер",
  status: "Статус",
  priority: "Приоритет",
  assignedTo: "Назначена",
};

type IssueTableProps = {
  title: string;
  description: string;
  issues: RedmineIssue[];
  redmineUrl: string;
  loading: boolean;
  error: string | null;
  configured: boolean;
  showAssignee?: boolean;
  compact?: boolean;
  detailColumnOrder?: DetailColumn[];
};

export function IssueTable({
  title,
  description,
  issues,
  redmineUrl,
  loading,
  error,
  configured,
  showAssignee = true,
  compact = false,
  detailColumnOrder = ["project", "tracker", "status", "priority", "assignedTo"],
}: IssueTableProps) {
  const headingId = useId();
  const visibleColumns = compact ? [] : detailColumnOrder.filter((column) => column !== "assignedTo" || showAssignee);
  return (
    <section aria-labelledby={headingId} aria-busy={loading} className="flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          {!loading && !error && configured && (
            <span className="shrink-0 rounded-md bg-sky-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-sky-300">{issues.length}</span>
          )}
          <h2 id={headingId} className="text-base font-extrabold text-zinc-100">{title}</h2>
        </div>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      </div>
      <Table
        variant="embedded"
        minWidth={compact ? 0 : undefined}
        headers={[
          { key: "id", component: "Задача" },
          { key: "subject", component: "Название" },
          ...visibleColumns.map((column) => ({ key: column, component: columnLabels[column] })),
        ]}
        rows={issues.map((issue) => ({
          key: String(issue.id),
          component: (
            <tr className="transition hover:bg-zinc-800/70">
              <td className="whitespace-nowrap px-4 py-3 font-bold text-sky-300">
                <a href={`${redmineUrl.replace(/\/+$/, "")}/issues/${issue.id}`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">#{issue.id}</a>
              </td>
              <td className={`${compact ? "w-full min-w-0 [overflow-wrap:anywhere]" : "min-w-[240px]"} px-4 py-3 text-zinc-100`}>{issue.subject}</td>
              {visibleColumns.map((column) => (
                <td key={column} className="px-4 py-3 text-zinc-300">{issue[column] || "—"}</td>
              ))}
            </tr>
          ),
        }))}
        emptyState={
          <div role={error ? "alert" : "status"} className={`px-5 py-6 text-sm ${error ? "text-red-300" : "text-zinc-400"}`}>
            {loading ? "Загрузка задач…" : error ?? (configured ? "Задач по этому фильтру нет" : "Настройте подключение к Redmine")}
          </div>
        }
      />
    </section>
  );
}
