import type { Entry } from "../types";
import { TimeEntryRow } from "./TimeEntryRow";
import { Table } from "../shared/ui/Table";

type TimeEntriesTableProps = {
  entries: Entry[];
  redmineUrl: string;
  onDelete: Parameters<typeof TimeEntryRow>[0]["onDelete"];
};

export function TimeEntriesTable({ entries, redmineUrl, onDelete }: TimeEntriesTableProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <Table
        headers={[
          { key: "duration", component: "Время" },
          { key: "issue", component: "Номер задачи" },
          { key: "tracker", component: "Трекер" },
          { key: "subject", component: "Имя задачи" },
          { key: "activity", component: "Деятельность" },
          { key: "comment", component: "Комментарий" },
          { key: "synced", component: "Синхронизировано" },
          { key: "actions", component: "" },
        ]}
        rows={entries.map((entry) => ({
          key: entry.id,
          component: (
            <TimeEntryRow
              entry={entry}
              redmineUrl={redmineUrl}
              onDelete={onDelete}
            />
          ),
        }))}
        emptyState={
          <div className="flex min-h-[250px] flex-1 flex-col items-center justify-center gap-2 border-t border-dashed border-zinc-800 text-zinc-500">
            <strong className="text-base text-zinc-300">
              За выбранный день записей нет
            </strong>
            <span>
              Добавьте запись через форму выше или синхронизируйте день.
            </span>
          </div>
        }
      />
    </section>
  );
}
