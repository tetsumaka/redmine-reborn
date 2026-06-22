import { ACTIVITY_COLORS } from "../constants";
import type { Entry } from "../types";
import { durationMinutes, formatDuration, formatMinutes } from "../utils";

type DailyTotal = {
  date: string;
  sortKey: number;
  day: number;
  weekday: string;
  total: number;
  activities: Map<string, number>;
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

function dailyTotals(entries: Entry[]): DailyTotal[] {
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
      activities: new Map<string, number>()
    };
    current.total += minutes;
    current.activities.set(entry.activity, (current.activities.get(entry.activity) ?? 0) + minutes);
    totals.set(entry.date, current);
  }
  return [...totals.values()].sort((left, right) => left.sortKey - right.sortKey);
}

export function DailyActivityChart({ entries }: { entries: Entry[] }) {
  const days = dailyTotals(entries);
  if (days.length === 0) {
    return <section className="analytics-card empty"><strong>Нет данных для графика</strong><span>Добавьте или загрузите записи за выбранный месяц.</span></section>;
  }
  const maxTotal = Math.max(...days.map((day) => day.total));
  const activities = [...new Set(days.flatMap((day) => [...day.activities.keys()]))];
  const weeks = weekGroups(days);

  return (
    <section className="analytics-card">
      <div className="analytics-heading">
        <div><h2>Время по дням</h2><p>Цвет показывает долю каждой активности в рабочем дне.</p></div>
        <div className="chart-legend">
          {activities.map((activity) => <span key={activity}><i style={{ background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }} />{activity}</span>)}
        </div>
      </div>
      <div className="daily-chart-scroll">
        <div className="daily-chart">
          {weeks.map((week) => (
            <section className="week-group" key={week.key}>
              <div className="week-heading"><strong>Неделя {week.number}</strong><span>{week.range}</span></div>
              <div className="week-days">
                {week.days.map((day) => (
                  <div className="day-column" key={day.date}>
                    <strong className="day-total">{formatDuration(day.total)}</strong>
                    <div className="day-bar-track">
                      <div className="day-bar" style={{ height: `${Math.max(8, day.total / maxTotal * 100)}%` }}>
                        {[...day.activities.entries()].map(([activity, minutes]) => (
                          <span
                            key={activity}
                            title={`${activity}: ${formatMinutes(minutes)}`}
                            style={{ height: `${minutes / day.total * 100}%`, background: ACTIVITY_COLORS[activity] ?? "#94a3b8" }}
                          />
                        ))}
                      </div>
                    </div>
                    <strong className="day-number">{day.day}</strong>
                    <span className="weekday">{day.weekday}</span>
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
