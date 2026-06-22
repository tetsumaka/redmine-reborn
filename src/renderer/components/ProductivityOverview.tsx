import { ACTIVITY_COLORS } from "../constants";
import type { Entry } from "../types";
import { durationMinutes, formatMinutes } from "../utils";

export function ProductivityOverview({ entries }: { entries: Entry[] }) {
  const total = entries.reduce((sum, entry) => sum + durationMinutes(entry), 0);
  const activeDays = new Set(entries.filter((entry) => durationMinutes(entry) > 0).map((entry) => entry.date)).size;
  const activities = new Map<string, number>();
  for (const entry of entries) {
    const minutes = durationMinutes(entry);
    if (minutes > 0) activities.set(entry.activity, (activities.get(entry.activity) ?? 0) + minutes);
  }
  const rankedActivities = [...activities.entries()].sort((left, right) => right[1] - left[1]);
  const leader = rankedActivities[0];

  return (
    <section className="overview">
      <div className="metric-grid">
        <article className="metric"><span>Всего за месяц</span><strong>{formatMinutes(total)}</strong></article>
        <article className="metric"><span>Активных дней</span><strong>{activeDays}</strong></article>
        <article className="metric"><span>Среднее за день</span><strong>{activeDays ? formatMinutes(Math.round(total / activeDays)) : "0 мин"}</strong></article>
        <article className="metric"><span>Основная активность</span><strong>{leader?.[0] ?? "Нет данных"}</strong><small>{leader ? formatMinutes(leader[1]) : ""}</small></article>
      </div>
      <div className="analytics-card activity-breakdown">
        <div className="analytics-heading"><div><h2>Структура времени</h2><p>Распределение рабочего времени по активностям.</p></div></div>
        {rankedActivities.length > 0 ? rankedActivities.map(([activity, minutes]) => (
          <div className="activity-row" key={activity}>
            <span className="activity-name"><i style={{ background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} />{activity}</span>
            <div className="activity-track"><span style={{ width: `${total ? minutes / total * 100 : 0}%`, background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} /></div>
            <strong>{formatMinutes(minutes)}</strong>
            <small>{total ? Math.round(minutes / total * 100) : 0}%</small>
          </div>
        )) : <div className="empty"><strong>Пока нечего анализировать</strong><span>Добавьте записи за выбранный месяц.</span></div>}
      </div>
    </section>
  );
}
