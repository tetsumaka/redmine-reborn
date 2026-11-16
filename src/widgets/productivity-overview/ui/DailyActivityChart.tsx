import type { ActivityType, TimeEntry } from "src/entities/time-entry";
import { ACTIVITY_COLORS } from "src/shared/config/constants";
import { durationMinutes } from "src/entities/time-entry";
import { formatDuration, formatMinutes } from "src/shared/lib/duration";

type DailyTotal = {
  date: string;
  sortKey: number;
  day: number;
  weekday: string;
  total: number;
  activities: Map<ActivityType, number>;
};

type WeekGroup = { key: string; number: number; range: string; days: DailyTotal[] };

function isoWeekNumber(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

function weekGroups(days: DailyTotal[]): WeekGroup[] {
  const groups = new Map<string, WeekGroup>();
  for (const day of days) {
    const year = Math.floor(day.sortKey / 10_000);
    const month = Math.floor(day.sortKey / 100) % 100;
    const date = new Date(year, month - 1, day.day);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const key = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
    const start = monday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const end = sunday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const group = groups.get(key) ?? {
      key,
      number: isoWeekNumber(date),
      range: `${start} - ${end}`,
      days: []
    };
    group.days.push(day);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function dailyTotals(entries: TimeEntry[]): DailyTotal[] {
  const totals = new Map<string, DailyTotal>();
  for (const entry of entries) {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
    if (!match) continue;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const minutes = durationMinutes(entry);
    if (minutes <= 0) continue;
    const current = totals.get(entry.date) ?? {
      date: entry.date,
      sortKey: year * 10_000 + month * 100 + day,
      day,
      weekday: new Date(year, month - 1, day).toLocaleDateString("ru-RU", { weekday: "short" }),
      total: 0,
      activities: new Map<ActivityType, number>()
    };
    current.total += minutes;
    current.activities.set(entry.activity, (current.activities.get(entry.activity) ?? 0) + minutes);
    totals.set(entry.date, current);
  }
  return [...totals.values()].sort((left, right) => left.sortKey - right.sortKey);
}

export function DailyActivityChart({ entries }: { entries: TimeEntry[] }) {
  const days = dailyTotals(entries);
  if (days.length === 0) {
    return <section className="flex min-h-[330px] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 shadow-xl shadow-black/25"><strong className="text-base text-zinc-300">Нет данных для графика</strong><span>Добавьте или загрузите записи за выбранный месяц.</span></section>;
  }
  const maxTotal = Math.max(...days.map((day) => day.total));
  const activities = [...new Set(days.flatMap((day) => [...day.activities.keys()]))];
  const weeks = weekGroups(days);

  return (
    <section className="min-h-[330px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
      <div className="mb-6 flex items-start justify-between gap-6 max-[1200px]:flex-col">
        <div><h2 className="text-lg font-extrabold text-zinc-50">Время по дням</h2><p className="mt-1 text-sm text-zinc-500">Цвет показывает долю каждой активности в рабочем дне.</p></div>
        <div className="flex max-w-[650px] flex-wrap justify-end gap-x-4 gap-y-2 text-xs text-zinc-300 max-[1200px]:justify-start">
          {activities.map((activity) => <span className="inline-flex items-center gap-1.5" key={activity}><i className="inline-block size-2.5 rounded-sm" style={{ background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} />{activity}</span>)}
        </div>
      </div>
      <div className="overflow-x-auto px-1 pb-2">
        <div className="flex h-[382px] min-w-full items-stretch gap-3.5">
          {weeks.map((week) => (
            <section className="grid grid-rows-[46px_1fr] rounded-lg border border-zinc-800 bg-zinc-950 p-3" key={week.key}>
              <div className="flex items-start justify-between gap-5 border-b border-zinc-800 px-0.5 pb-2"><strong className="whitespace-nowrap text-xs font-extrabold text-sky-300">Неделя {week.number}</strong><span className="whitespace-nowrap text-[10px] text-zinc-500">{week.range}</span></div>
              <div className="flex items-end gap-2.5 pt-2">
                {week.days.map((day) => (
                  <div className="grid w-[52px] min-w-[52px] flex-1 grid-rows-[22px_260px_20px_18px] text-center" key={day.date}>
                    <strong className="whitespace-nowrap font-mono text-[10px] text-zinc-400">{formatDuration(day.total)}</strong>
                    <div className="flex h-[260px] items-end justify-center border-b border-zinc-700 bg-[repeating-linear-gradient(to_top,#3f3f46_0,#3f3f46_1px,transparent_1px,transparent_65px)]">
                      <div className="flex min-h-2 w-[34px] flex-col justify-stretch overflow-hidden rounded-t-md rounded-b-sm shadow-lg shadow-black/50" style={{ height: `${Math.max(8, day.total / maxTotal * 100)}%` }}>
                        {[...day.activities.entries()].map(([activity, minutes]) => (
                          <span
                            key={activity}
                            className="block min-h-[2px]"
                            title={`${activity}: ${formatMinutes(minutes)}`}
                            style={{ height: `${minutes / day.total * 100}%`, background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }}
                          />
                        ))}
                      </div>
                    </div>
                    <strong className="self-end text-xs text-zinc-100">{day.day}</strong>
                    <span className="text-[10px] uppercase text-zinc-500">{day.weekday}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
