import { useId } from "react";
import type { RedmineIssue } from "src/shared/types";
import { Table } from "src/renderer/shared/ui/Table";

type IssueTableProps = {
  title: string;
  description: string;
  issues: RedmineIssue[];
  redmineUrl: string;
  loading: boolean;
  error: string | null;
  configured: boolean;
  showAssignee?: boolean;
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
}: IssueTableProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} aria-busy={loading} className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <h2 id={headingId} className="text-base font-extrabold text-zinc-100">{title}</h2>
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
        </div>
        {!loading && !error && configured && (
          <span className="rounded-md bg-sky-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-sky-300">{issues.length}</span>
        )}
      </div>
      <Table
        variant="embedded"
        headers={[
          { key: "id", component: "Задача" },
          { key: "subject", component: "Название" },
          { key: "project", component: "Проект" },
          { key: "tracker", component: "Трекер" },
          { key: "status", component: "Статус" },
          { key: "priority", component: "Приоритет" },
          ...(showAssignee ? [{ key: "assignedTo", component: "Назначена" }] : []),
        ]}
        rows={issues.map((issue) => ({
          key: String(issue.id),
          component: (
            <tr className="transition hover:bg-zinc-800/70">
              <td className="px-4 py-3 font-bold text-sky-300">
                <a href={`${redmineUrl.replace(/\/+$/, "")}/issues/${issue.id}`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">#{issue.id}</a>
              </td>
              <td className="min-w-[240px] px-4 py-3 text-zinc-100">{issue.subject}</td>
              {[issue.project, issue.tracker, issue.status, issue.priority].map((value, index) => (
                <td key={index} className="px-4 py-3 text-zinc-300">{value || "—"}</td>
              ))}
              {showAssignee && <td className="px-4 py-3 text-zinc-300">{issue.assignedTo || "—"}</td>}
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
