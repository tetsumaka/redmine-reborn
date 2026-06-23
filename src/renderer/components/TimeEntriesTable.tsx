import type { Entry } from "../types";
import { TimeEntryRow } from "./TimeEntryRow";
import { Table, TableBody, TableHeadCell, TableHeader, TableRow } from "./ui";

type TimeEntriesTableProps = {
  entries: Entry[];
  redmineUrl: string;
  onDelete: Parameters<typeof TimeEntryRow>[0]["onDelete"];
};

export function TimeEntriesTable({ entries, redmineUrl, onDelete }: TimeEntriesTableProps) {
  return (
    <section>
      {entries.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-zinc-800">
              <TableHeadCell>Время</TableHeadCell>
              <TableHeadCell>Номер задачи</TableHeadCell>
              <TableHeadCell>Трекер</TableHeadCell>
              <TableHeadCell>Имя задачи</TableHeadCell>
              <TableHeadCell>Деятельность</TableHeadCell>
              <TableHeadCell>Комментарий</TableHeadCell>
              <TableHeadCell>Синхронизировано</TableHeadCell>
              <TableHeadCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => <TimeEntryRow key={entry.id} entry={entry} redmineUrl={redmineUrl} onDelete={onDelete} />)}
          </TableBody>
        </Table>
      )}
      {entries.length === 0 && (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800 bg-zinc-900 text-zinc-500">
          <strong className="text-base text-zinc-300">За выбранный день записей нет</strong>
          <span>Добавьте запись через форму выше или синхронизируйте день.</span>
        </div>
      )}
    </section>
  );
}
