import type { TimeEntry } from "src/entities/time-entry/model/types";

export function entryPeriod(
  entry: TimeEntry,
): { year: number; month: number } | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
  return match ? { year: Number(match[3]), month: Number(match[2]) } : null;
}
