import type { Entry } from "../types";
import { TimeEntryRow } from "./TimeEntryRow";

type TimeEntriesTableProps = {
  entries: Entry[];
  onChange: Parameters<typeof TimeEntryRow>[0]["onChange"];
  onDelete: Parameters<typeof TimeEntryRow>[0]["onDelete"];
};

export function TimeEntriesTable({ entries, onChange, onDelete }: TimeEntriesTableProps) {
  return (
    <section className="table-card">
      {entries.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Дата</th><th>Номер задачи</th><th>Начало</th><th>Конец</th><th>Время</th>
              <th>Трекер</th><th>Имя задачи</th><th>Деятельность</th><th>Комментарий</th>
              <th>Местонахождение</th><th>Синхронизировано</th><th></th>
            </tr></thead>
            <tbody>
              {entries.map((entry) => <TimeEntryRow key={entry.id} entry={entry} onChange={onChange} onDelete={onDelete} />)}
            </tbody>
          </table>
        </div>
      )}
      {entries.length === 0 && (
        <div className="empty"><strong>В этом месяце записей нет</strong><span>Добавьте первую строку и укажите время работы.</span></div>
      )}
    </section>
  );
}
