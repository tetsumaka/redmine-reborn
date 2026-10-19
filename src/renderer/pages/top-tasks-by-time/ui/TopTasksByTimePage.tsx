import React, { useMemo } from "react";
import type { TaskTotal } from "src/renderer/entities/task";
import { Table } from "src/renderer/shared/ui/Table";
import { useAppSelector } from "src/renderer/app/providers/store/hooks";
import { MonthPeriodToolbar } from "src/renderer/widgets/month-period-toolbar";
import { durationMinutes, entryPeriod } from "src/renderer/entities/time-entry";
import { formatMinutes } from "src/renderer/shared/lib/duration";

export function TopTasksByTimePage(): React.JSX.Element {
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
      <MonthPeriodToolbar />
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
        <Table
          variant="embedded"
          headers={[
            { key: "issue", component: "Задача" },
            { key: "subject", component: "Название" },
            { key: "tracker", component: "Трекер" },
            { key: "entries", component: "Записей" },
            { key: "share", component: "Доля" },
            { key: "duration", component: "Время" },
          ]}
          rows={tasks.map((task) => ({
            key: `${task.issueId}:${task.subject}`,
            component: (
              <tr className="transition hover:bg-zinc-800/70">
                <td className="h-14 px-4 py-3 align-middle font-extrabold text-sky-300">
                  {task.issueId ? `#${task.issueId}` : "-"}
                </td>
                <td className="h-14 px-4 py-3 align-middle text-zinc-200">
                  {task.subject}
                </td>
                <td className="h-14 px-4 py-3 align-middle text-zinc-200">
                  {task.tracker}
                </td>
                <td className="h-14 px-4 py-3 align-middle text-zinc-200">
                  {task.entries}
                </td>
                <td className="h-14 px-4 py-3 align-middle text-zinc-200">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
                    <span
                      className="block h-full min-w-[2px] rounded-full bg-sky-500"
                      style={{
                        width: `${total ? (task.minutes / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="h-14 whitespace-nowrap px-4 py-3 align-middle font-extrabold tabular-nums text-zinc-200">
                  {formatMinutes(task.minutes)}
                </td>
              </tr>
            ),
          }))}
          emptyState={
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 border-t border-zinc-800 text-zinc-500">
            <strong className="text-base text-zinc-300">
              Нет данных по задачам
            </strong>
            <span>За выбранный месяц ещё нет записей.</span>
          </div>
          }
        />
      </section>
    </div>
  );
}
