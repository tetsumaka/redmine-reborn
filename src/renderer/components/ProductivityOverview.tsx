import { ACTIVITY_COLORS } from "../constants";
import type { Entry } from "../types";
import { durationMinutes, formatMinutes } from "../utils";
import { DailyActivityChart } from "./DailyActivityChart";

export function ProductivityOverview({ entries }: { entries: Entry[] }) {
  const total = entries.reduce((sum, entry) => sum + durationMinutes(entry), 0);
  const activeDays = new Set(entries.filter((entry) => durationMinutes(entry) > 0).map((entry) => entry.date)).size;
  const activities = new Map<string, number>();
  for (const entry of entries) {
    const minutes = durationMinutes(entry);
    if (minutes > 0) activities.set(entry.activity, (activities.get(entry.activity) ?? 0) + minutes);
  }
  const rankedActivities = [...activities.entries()].sort((left, right) => right[1] - left[1]);

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <div className="grid gap-3.5">
          <article className="min-h-[125px] rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/20"><span className="mb-4 block text-xs font-extrabold uppercase text-zinc-500">Всего за месяц</span><strong className="block text-2xl font-extrabold text-zinc-50">{formatMinutes(total)}</strong></article>
          <article className="min-h-[125px] rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/20"><span className="mb-4 block text-xs font-extrabold uppercase text-zinc-500">Среднее за день</span><strong className="block text-2xl font-extrabold text-zinc-50">{activeDays ? formatMinutes(Math.round(total / activeDays)) : "0 мин"}</strong></article>
        </div>
        <div className="min-h-[260px] rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/25">
          <div className="mb-6"><div><h2 className="text-lg font-extrabold text-zinc-50">Структура времени</h2><p className="mt-1 text-sm text-zinc-500">Распределение рабочего времени по активностям.</p></div></div>
          {rankedActivities.length > 0 ? rankedActivities.map(([activity, minutes]) => (
            <div className="grid min-h-11 grid-cols-[145px_minmax(200px,1fr)_95px_45px] items-center gap-4" key={activity}>
              <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-300"><i className="inline-block size-2.5 rounded-sm" style={{ background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} />{activity}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full min-w-[2px] rounded-full" style={{ width: `${total ? minutes / total * 100 : 0}%`, background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} /></div>
              <strong className="text-right tabular-nums">{formatMinutes(minutes)}</strong>
              <small className="text-right text-zinc-500">{total ? Math.round(minutes / total * 100) : 0}%</small>
            </div>
          )) : <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-zinc-500"><strong className="text-base text-zinc-300">Пока нечего анализировать</strong><span>Добавьте записи за выбранный месяц.</span></div>}
        </div>
      </div>
      <DailyActivityChart entries={entries} />
    </section>
  );
}
