import type { ActivityType, TrackerType } from "src/shared/types";
import type { Entry } from "./types";

/*
 * Converts a number to a two-character string.
 * Example: 7 -> "07", 12 -> "12"
 */
export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/*
 * Converts an entry display date to a year/month period object.
 * Example: { date: "28.06.2026" } -> { year: 2026, month: 6 }
 */
export function entryPeriod(
  entry: Entry,
): { year: number; month: number } | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
  return match ? { year: Number(match[3]), month: Number(match[2]) } : null;
}

/*
 * Converts the current local date to ISO date format.
 * Example: June 28, 2026 -> "2026-06-28"
 */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/*
 * Converts an ISO date to display date format.
 * Example: "2026-06-28" -> "28.06.2026"
 */
export function isoToDisplayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

/*
 * Converts a display date to ISO date format.
 * Example: "28.06.2026" -> "2026-06-28"
 */
export function displayDateToIso(value: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

/*
 * Converts an ISO date plus a day offset to another ISO date.
 * Example: ("2026-06-28", 2) -> "2026-06-30"
 */
export function addDaysIso(value: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/*
 * Converts entry duration data to total minutes.
 * Example: { start: "09:15", end: "10:45" } -> 90
 */
export function durationMinutes(entry: Entry): number {
  if (Number.isFinite(entry.minutes))
    return Math.max(0, Math.round(entry.minutes ?? 0));
  const [startHour, startMinute] = (entry.start ?? "").split(":").map(Number);
  const [endHour, endMinute] = (entry.end ?? "").split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

/*
 * Converts an entry duration to compact H:MM text.
 * Example: { minutes: 90 } -> "1:30"
 */
export function formattedDuration(entry: Entry): string {
  const minutes = durationMinutes(entry);
  return minutes > 0 ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}` : "-";
}

/*
 * Converts total minutes to human-readable text.
 * Example: 90 -> "1 h 30 min"
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 мин";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} ч${rest ? ` ${rest} мин` : ""}` : `${rest} мин`;
}

/*
 * Converts total minutes to H:MM text.
 * Example: 90 -> "1:30"
 */
export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

/*
 * Converts H:MM text to total minutes.
 * Example: "1:30" -> 90
 */
export function parseDuration(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes > 0 ? minutes : null;
}

/*
 * Converts a start/end time interval to total minutes.
 * Example: ("09:15", "10:45") -> 90
 */
export function intervalDuration(start: string, end: string): number | null {
  const startMatch = /^(\d{2}):(\d{2})$/.exec(start);
  const endMatch = /^(\d{2}):(\d{2})$/.exec(end);
  if (!startMatch || !endMatch) return null;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  const minutes = endMinutes - startMinutes;
  return minutes > 0 ? minutes : null;
}

/*
 * Converts total seconds to HH:MM:SS timer text.
 * Example: 3661 -> "01:01:01"
 */
export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(rest)}`;
}

/*
 * Converts form-like input data to a stored Entry object.
 * Example: ("28.06.2026", { issueId: " 123 ", minutes: 90, ... }) -> Entry
 */
export function createEntry(
  date: string,
  input: {
    issueId: string;
    activity: ActivityType;
    comment: string;
    minutes: number;
    start?: string;
    end?: string;
    tracker?: TrackerType;
    subject?: string;
    estimatedHours?: number;
  },
): Entry {
  return {
    id: crypto.randomUUID(),
    date,
    issueId: input.issueId.trim(),
    start: input.start,
    end: input.end,
    minutes: input.minutes,
    tracker: input.tracker || "Feature",
    subject: input.subject?.trim() || "",
    estimatedHours: Number.isFinite(input.estimatedHours)
      ? input.estimatedHours
      : undefined,
    activity: input.activity,
    comment: input.comment.trim(),
    synced: false,
    createdAt: new Date().toISOString(),
  };
}
