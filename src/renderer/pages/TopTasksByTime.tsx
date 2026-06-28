import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from "src/renderer/components/ui";
import { useAppSelector } from "src/renderer/store/hooks";
import { MonthToolbar } from "src/renderer/use-cases/MonthToolbar";
import {
  durationMinutes,
  entryPeriod,
  formatMinutes,
} from "src/renderer/utils";

type TaskTotal = {
  issueId: string;
  subject: string;
  tracker: string;
  minutes: number;
  entries: number;
};

export function TopTasksByTime(): React.JSX.Element {
  const data = useAppSelector((state) => state.appData.data);
  const selectedPeriodKey = useAppSelector(
    (state) => state.monthToolbar.selectedPeriodKey,
  );

  const selectedPeriod = useMemo(() => {
    const [year, month] = selectedPeriodKey.split("-").map(Number);
    return { year, month };
  }, [selectedPeriodKey]);

  const visibleMonthEntries = useMemo(
    () =>
      data?.entries.filter((entry) => {
        const period = entryPeriod(entry);
        return (
          period?.year === selectedPeriod.year &&
          period.month === selectedPeriod.month
        );
      }) ?? [],
    [data?.entries, selectedPeriod.month, selectedPeriod.year],
  );

  const byTask = new Map<string, TaskTotal>();
  for (const entry of visibleMonthEntries) {
    const minutes = durationMinutes(entry);
    if (minutes <= 0) continue;
    const key = entry.issueId || `without-issue:${entry.subject}`;
    const current = byTask.get(key) ?? {
      issueId: entry.issueId,
      subject: entry.subject || "Без названия",
      tracker: entry.tracker,
      minutes: 0,
      entries: 0,
    };
    current.minutes += minutes;
    current.entries += 1;
    byTask.set(key, current);
  }
  const tasks = [...byTask.values()].sort(
    (left, right) => right.minutes - left.minutes,
  );
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MonthToolbar />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/25">
        <div className="shrink-0 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-50">
              Время по задачам
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Задачи отсортированы от самых трудозатратных.
            </p>
          </div>
        </div>
        {tasks.length > 0 ? (
          <Table className="rounded-none border-x-0 border-b-0 shadow-none">
            <TableHeader>
              <TableRow>
                <TableHeadCell>Задача</TableHeadCell>
                <TableHeadCell>Название</TableHeadCell>
                <TableHeadCell>Трекер</TableHeadCell>
                <TableHeadCell>Записей</TableHeadCell>
                <TableHeadCell>Доля</TableHeadCell>
                <TableHeadCell>Время</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={`${task.issueId}:${task.subject}`}>
                  <TableCell className="font-extrabold text-sky-300">
                    {task.issueId ? `#${task.issueId}` : "-"}
                  </TableCell>
                  <TableCell>{task.subject}</TableCell>
                  <TableCell>{task.tracker}</TableCell>
                  <TableCell>{task.entries}</TableCell>
                  <TableCell>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
                      <span
                        className="block h-full min-w-[2px] rounded-full bg-sky-500"
                        style={{
                          width: `${total ? (task.minutes / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-extrabold tabular-nums">
                    {formatMinutes(task.minutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-zinc-500">
            <strong className="text-base text-zinc-300">
              Нет данных по задачам
            </strong>
            <span>За выбранный месяц ещё нет записей.</span>
          </div>
        )}
      </section>
    </div>
  );
}
