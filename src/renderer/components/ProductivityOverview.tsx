import { ACTIVITY_COLORS, TRACKER_COLORS } from "../constants";
import type { Entry } from "../types";
import { durationMinutes, formatMinutes } from "../utils";
import { DailyActivityChart } from "./DailyActivityChart";

type DistributionItem = { name: string; minutes: number; color: string };
type TaskTotal = { key: string; issueId: string; subject: string; tracker: string; minutes: number; estimatedHours?: number };
type DaySwitching = { date: string; day: number; sortKey: number; tasks: number };
type SizeBucket = { label: string; tasks: number; color: string };

const fallbackColors = ["#64748b", "#06b6d4", "#84cc16", "#f59e0b", "#ec4899", "#8b5cf6"];
const sizeBuckets = [
  { label: "< 1 ч", min: 0, max: 60, color: "#38bdf8" },
  { label: "1 - 4 ч", min: 60, max: 240, color: "#22c55e" },
  { label: "4 - 8 ч", min: 240, max: 480, color: "#eab308" },
  { label: "8 - 16 ч", min: 480, max: 960, color: "#f97316" },
  { label: "> 16 ч", min: 960, max: Infinity, color: "#ef4444" }
];

function colorFor(name: string, palette: Record<string, string>, index: number): string {
  return palette[name] ?? fallbackColors[index % fallbackColors.length];
}

function distribution(entries: Entry[], key: "activity" | "tracker", palette: Record<string, string>): DistributionItem[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const minutes = durationMinutes(entry);
    if (minutes <= 0) continue;
    const name = key === "activity" ? entry.activity : entry.tracker || "Без типа";
    totals.set(name, (totals.get(name) ?? 0) + minutes);
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, minutes], index) => ({ name, minutes, color: colorFor(name, palette, index) }));
}

function taskTotals(entries: Entry[]): TaskTotal[] {
  const totals = new Map<string, TaskTotal>();
  for (const entry of entries) {
    const minutes = durationMinutes(entry);
    if (minutes <= 0) continue;
    const key = entry.issueId || `${entry.tracker}:${entry.subject}`;
    const current = totals.get(key) ?? {
      key,
      issueId: entry.issueId,
      subject: entry.subject || "Без названия",
      tracker: entry.tracker || "Без типа",
      minutes: 0,
      estimatedHours: entry.estimatedHours
    };
    current.minutes += minutes;
    if (!Number.isFinite(current.estimatedHours) && Number.isFinite(entry.estimatedHours)) {
      current.estimatedHours = entry.estimatedHours;
    }
    totals.set(key, current);
  }
  return [...totals.values()];
}

function dailySwitching(entries: Entry[]): DaySwitching[] {
  const days = new Map<string, { date: string; day: number; sortKey: number; tasks: Set<string> }>();
  for (const entry of entries) {
    if (durationMinutes(entry) <= 0) continue;
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
    if (!match) continue;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const current = days.get(entry.date) ?? {
      date: entry.date,
      day,
      sortKey: year * 10_000 + month * 100 + day,
      tasks: new Set<string>()
    };
    current.tasks.add(entry.issueId || `${entry.tracker}:${entry.subject}`);
    days.set(entry.date, current);
  }
  return [...days.values()]
    .map((day) => ({ date: day.date, day: day.day, sortKey: day.sortKey, tasks: day.tasks.size }))
    .sort((left, right) => left.sortKey - right.sortKey);
}

function averageByTracker(tasks: TaskTotal[]): DistributionItem[] {
  const totals = new Map<string, { minutes: number; tasks: number }>();
  for (const task of tasks) {
    const current = totals.get(task.tracker) ?? { minutes: 0, tasks: 0 };
    current.minutes += task.minutes;
    current.tasks += 1;
    totals.set(task.tracker, current);
  }
  return [...totals.entries()]
    .map(([name, total], index) => ({
      name,
      minutes: Math.round(total.minutes / Math.max(1, total.tasks)),
      color: colorFor(name, TRACKER_COLORS, index)
    }))
    .sort((left, right) => right.minutes - left.minutes);
}

function taskSizeDistribution(tasks: TaskTotal[]): SizeBucket[] {
  return sizeBuckets.map((bucket) => ({
    label: bucket.label,
    color: bucket.color,
    tasks: tasks.filter((task) => task.minutes > bucket.min && task.minutes <= bucket.max).length
  }));
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-h-[125px] rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/20">
      <span className="mb-4 block text-xs font-extrabold uppercase text-zinc-500">{label}</span>
      <strong className="block text-2xl font-extrabold text-zinc-50">{value}</strong>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center text-zinc-500">
      <strong className="text-base text-zinc-300">{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function DistributionCard({
  title,
  description,
  items,
  total
}: {
  title: string;
  description: string;
  items: DistributionItem[];
  total: number;
}) {
  return (
    <article className="min-h-[260px] rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
      <div className="mb-6"><h2 className="text-lg font-extrabold text-zinc-50">{title}</h2><p className="mt-1 text-sm text-zinc-500">{description}</p></div>
      {items.length > 0 ? items.map((item) => (
        <div className="grid min-h-11 grid-cols-[145px_minmax(200px,1fr)_95px_45px] items-center gap-4" key={item.name}>
          <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-zinc-300"><i className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} /><span className="truncate">{item.name}</span></span>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full min-w-[2px] rounded-full" style={{ width: `${total ? item.minutes / total * 100 : 0}%`, background: item.color }} /></div>
          <strong className="text-right tabular-nums">{formatMinutes(item.minutes)}</strong>
          <small className="text-right text-zinc-500">{total ? Math.round(item.minutes / total * 100) : 0}%</small>
        </div>
      )) : <EmptyState title="Пока нечего анализировать" text="Добавьте записи за выбранный месяц." />}
    </article>
  );
}

function ContextSwitchingChart({ days }: { days: DaySwitching[] }) {
  const maxTasks = Math.max(1, ...days.map((day) => day.tasks));
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
      <div className="mb-6"><h2 className="text-lg font-extrabold text-zinc-50">Context Switching</h2><p className="mt-1 text-sm text-zinc-500">Количество уникальных задач в день.</p></div>
      {days.length > 0 ? (
        <div className="overflow-x-auto pb-1">
          <div className="flex h-[190px] min-w-full items-end gap-2">
            {days.map((day) => (
              <div className="grid w-[38px] min-w-[38px] grid-rows-[22px_120px_22px] text-center" key={day.date}>
                <strong className="text-xs tabular-nums text-zinc-300">{day.tasks}</strong>
                <div className="flex items-end justify-center border-b border-zinc-700">
                  <span className="w-5 rounded-t bg-cyan-400" style={{ height: `${Math.max(6, day.tasks / maxTasks * 112)}px` }} title={`${day.date}: ${day.tasks}`} />
                </div>
                <span className="text-[10px] text-zinc-500">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <EmptyState title="Нет данных" text="Уникальные задачи появятся после добавления записей." />}
    </article>
  );
}

function SimpleBars({ title, description, items, valueLabel }: { title: string; description: string; items: DistributionItem[]; valueLabel: (item: DistributionItem) => string }) {
  const max = Math.max(1, ...items.map((item) => item.minutes));
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
      <div className="mb-6"><h2 className="text-lg font-extrabold text-zinc-50">{title}</h2><p className="mt-1 text-sm text-zinc-500">{description}</p></div>
      {items.length > 0 ? items.map((item) => (
        <div className="grid min-h-11 grid-cols-[150px_minmax(160px,1fr)_95px] items-center gap-4" key={item.name}>
          <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-zinc-300"><i className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} /><span className="truncate">{item.name}</span></span>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full min-w-[2px] rounded-full" style={{ width: `${item.minutes / max * 100}%`, background: item.color }} /></div>
          <strong className="text-right tabular-nums">{valueLabel(item)}</strong>
        </div>
      )) : <EmptyState title="Нет данных" text="Недостаточно записей для расчета." />}
    </article>
  );
}

function TaskSizeDistribution({ buckets }: { buckets: SizeBucket[] }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.tasks));
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
      <div className="mb-6"><h2 className="text-lg font-extrabold text-zinc-50">Task Size Distribution</h2><p className="mt-1 text-sm text-zinc-500">Распределение задач по фактически потраченному времени.</p></div>
      {buckets.some((bucket) => bucket.tasks > 0) ? buckets.map((bucket) => (
        <div className="grid min-h-11 grid-cols-[120px_minmax(160px,1fr)_60px] items-center gap-4" key={bucket.label}>
          <span className="font-semibold text-zinc-300">{bucket.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full min-w-[2px] rounded-full" style={{ width: `${bucket.tasks / max * 100}%`, background: bucket.color }} /></div>
          <strong className="text-right tabular-nums">{bucket.tasks}</strong>
        </div>
      )) : <EmptyState title="Нет задач" text="Размеры задач появятся после добавления записей." />}
    </article>
  );
}

export function ProductivityOverview({ entries }: { entries: Entry[] }) {
  const total = entries.reduce((sum, entry) => sum + durationMinutes(entry), 0);
  const activeDays = new Set(entries.filter((entry) => durationMinutes(entry) > 0).map((entry) => entry.date)).size;
  const tasks = taskTotals(entries);
  const activityItems = distribution(entries, "activity", ACTIVITY_COLORS);
  const trackerItems = distribution(entries, "tracker", TRACKER_COLORS);
  const switchingDays = dailySwitching(entries);
  const averageTrackerItems = averageByTracker(tasks);
  const sizeDistribution = taskSizeDistribution(tasks);

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <div className="grid gap-3.5">
          <StatCard label="Всего за месяц" value={formatMinutes(total)} />
          <StatCard label="Среднее за день" value={activeDays ? formatMinutes(Math.round(total / activeDays)) : "0 мин"} />
          <StatCard label="Задач за месяц" value={String(tasks.length)} />
        </div>
        <DistributionCard title="Распределение по активностям" description="Распределение рабочего времени по активностям." items={activityItems} total={total} />
      </div>
      <DailyActivityChart entries={entries} />
      <div className="grid grid-cols-2 gap-4 max-[1200px]:grid-cols-1">
        <DistributionCard title="Распределение по типам" description="Доля времени по трекерам задач." items={trackerItems} total={total} />
        <ContextSwitchingChart days={switchingDays} />
      </div>
      <div className="grid grid-cols-2 gap-4 max-[1200px]:grid-cols-1">
        <SimpleBars title="Среднее время на задачу" description="Среднее фактическое время на одну задачу по каждому типу." items={averageTrackerItems} valueLabel={(item) => formatMinutes(item.minutes)} />
        <TaskSizeDistribution buckets={sizeDistribution} />
      </div>
    </section>
  );
}
