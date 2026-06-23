import type { Entry } from "../types";
import { durationMinutes, formatMinutes } from "../utils";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "./ui";

type TaskTotal = { issueId: string; subject: string; tracker: string; minutes: number; entries: number };

export function TaskSummaryTable({ entries }: { entries: Entry[] }) {
  const byTask = new Map<string, TaskTotal>();
  for (const entry of entries) {
    const minutes = durationMinutes(entry);
    if (minutes <= 0) continue;
    const key = entry.issueId || `without-issue:${entry.subject}`;
    const current = byTask.get(key) ?? {
      issueId: entry.issueId,
      subject: entry.subject || "Без названия",
      tracker: entry.tracker,
      minutes: 0,
      entries: 0
    };
    current.minutes += minutes;
    current.entries += 1;
    byTask.set(key, current);
  }
  const tasks = [...byTask.values()].sort((left, right) => right.minutes - left.minutes);
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/25">
      <div className="px-6 py-5"><div><h2 className="text-lg font-extrabold text-zinc-50">Время по задачам</h2><p className="mt-1 text-sm text-zinc-500">Задачи отсортированы от самых трудозатратных.</p></div></div>
      {tasks.length > 0 ? (
        <Table className="rounded-none border-x-0 border-b-0 shadow-none">
          <TableHeader><TableRow><TableHeadCell>Задача</TableHeadCell><TableHeadCell>Название</TableHeadCell><TableHeadCell>Трекер</TableHeadCell><TableHeadCell>Записей</TableHeadCell><TableHeadCell>Доля</TableHeadCell><TableHeadCell>Время</TableHeadCell></TableRow></TableHeader>
          <TableBody>{tasks.map((task) => (
            <TableRow key={`${task.issueId}:${task.subject}`}>
              <TableCell className="font-extrabold text-sky-300">{task.issueId ? `#${task.issueId}` : "-"}</TableCell>
              <TableCell>{task.subject}</TableCell>
              <TableCell>{task.tracker}</TableCell>
              <TableCell>{task.entries}</TableCell>
              <TableCell><div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700"><span className="block h-full min-w-[2px] rounded-full bg-sky-500" style={{ width: `${total ? task.minutes / total * 100 : 0}%` }} /></div></TableCell>
              <TableCell className="whitespace-nowrap font-extrabold tabular-nums">{formatMinutes(task.minutes)}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      ) : <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 text-zinc-500"><strong className="text-base text-zinc-300">Нет данных по задачам</strong><span>За выбранный месяц ещё нет записей.</span></div>}
    </section>
  );
}
