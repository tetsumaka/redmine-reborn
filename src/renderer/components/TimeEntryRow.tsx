import { ACTIVITIES, LOCATIONS, TRACKERS } from "../constants";
import type { Entry } from "../types";
import { formattedDuration } from "../utils";

export type EditableKey = "date" | "issueId" | "start" | "end" | "tracker" | "subject" | "activity" | "comment" | "location";
type TimeEntryRowProps = {
  entry: Entry;
  onChange: (id: string, key: EditableKey, value: string) => void;
  onDelete: (entry: Entry) => void;
};

type FieldProps = {
  entry: Entry;
  field: EditableKey;
  type?: string;
  className?: string;
  onChange: TimeEntryRowProps["onChange"];
};

function Field({ entry, field, type = "text", className = "", onChange }: FieldProps) {
  return (
    <input
      className={`cell-input ${className}`}
      type={type}
      value={entry[field]}
      onChange={(event) => onChange(entry.id, field, event.target.value)}
    />
  );
}

function Options({ entry, field, values, onChange }: FieldProps & { values: readonly string[] }) {
  return (
    <select className="cell-select" value={entry[field]} onChange={(event) => onChange(entry.id, field, event.target.value)}>
      {values.map((value) => <option key={value} value={value}>{value}</option>)}
    </select>
  );
}

export function TimeEntryRow({ entry, onChange, onDelete }: TimeEntryRowProps) {
  return (
    <tr>
      <td><Field entry={entry} field="date" className="date" onChange={onChange} /></td>
      <td><Field entry={entry} field="issueId" className="issue" onChange={onChange} /></td>
      <td><Field entry={entry} field="start" type="time" onChange={onChange} /></td>
      <td><Field entry={entry} field="end" type="time" onChange={onChange} /></td>
      <td className="duration">{formattedDuration(entry)}</td>
      <td><Options entry={entry} field="tracker" values={TRACKERS} onChange={onChange} /></td>
      <td><Field entry={entry} field="subject" onChange={onChange} /></td>
      <td><Options entry={entry} field="activity" values={ACTIVITIES} onChange={onChange} /></td>
      <td><Field entry={entry} field="comment" onChange={onChange} /></td>
      <td><Options entry={entry} field="location" values={LOCATIONS} onChange={onChange} /></td>
      <td>
        <span className={`status ${entry.synced ? "synced" : "pending"}`}>
          {entry.synced ? "Синхронизировано" : "Не синхронизировано"}
        </span>
      </td>
      <td><button className="icon-button delete" title="Удалить" onClick={() => onDelete(entry)}>x</button></td>
    </tr>
  );
}
