import type { Entry } from "../types";
import { durationMinutes, formatMinutes } from "../utils";

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
    <section className="analytics-card task-card">
      <div className="analytics-heading"><div><h2>Время по задачам</h2><p>Задачи отсортированы от самых трудозатратных.</p></div></div>
      {tasks.length > 0 ? (
        <div className="analytics-table-scroll">
          <table className="task-summary-table">
            <thead><tr><th>Задача</th><th>Название</th><th>Трекер</th><th>Записей</th><th>Доля</th><th>Время</th></tr></thead>
            <tbody>{tasks.map((task) => (
              <tr key={`${task.issueId}:${task.subject}`}>
                <td className="task-id">{task.issueId ? `#${task.issueId}` : "-"}</td>
                <td>{task.subject}</td>
                <td>{task.tracker}</td>
                <td>{task.entries}</td>
                <td><div className="share"><span style={{ width: `${total ? task.minutes / total * 100 : 0}%` }} /></div></td>
                <td className="task-time">{formatMinutes(task.minutes)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty"><strong>Нет данных по задачам</strong><span>За выбранный месяц ещё нет записей.</span></div>}
    </section>
  );
}
