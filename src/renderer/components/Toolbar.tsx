import { MONTHS } from "../constants";

type ToolbarProps = {
  year: number;
  month: number;
  years: number[];
  maxMonth: number;
  summary: string;
  syncing: boolean;
  showActions: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onAdd: () => void;
  onSync: () => void;
};

export function Toolbar(props: ToolbarProps) {
  return (
    <section className="toolbar">
      <div className="period">
        <label>Год
          <select value={props.year} onChange={(event) => props.onYearChange(Number(event.target.value))}>
            {props.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label>Месяц
          <select value={props.month} onChange={(event) => props.onMonthChange(Number(event.target.value))}>
            {MONTHS.slice(0, props.maxMonth).map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </label>
        <span className="summary">{props.summary}</span>
      </div>
      {props.showActions && (
        <div className="actions">
          <button className="button secondary" onClick={props.onAdd}>+ Добавить строку</button>
          <button className="button primary" disabled={props.syncing} onClick={props.onSync}>
            {props.syncing ? "Синхронизация..." : "Синхронизировать"}
          </button>
        </div>
      )}
    </section>
  );
}
