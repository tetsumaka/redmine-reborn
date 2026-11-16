import type { TimeEntry } from "src/entities/time-entry/model/types";
import { pad } from "src/shared/lib/date";

export function durationMinutes(entry: TimeEntry): number {
  if (Number.isFinite(entry.minutes))
    return Math.max(0, Math.round(entry.minutes ?? 0));
  const [startHour, startMinute] = (entry.start ?? "").split(":").map(Number);
  const [endHour, endMinute] = (entry.end ?? "").split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

export function formattedDuration(entry: TimeEntry): string {
  const minutes = durationMinutes(entry);
  return minutes > 0 ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}` : "-";
}
