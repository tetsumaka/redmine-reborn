import type { Entry } from "./types";

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function entryPeriod(entry: Entry): { year: number; month: number } | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
  return match ? { year: Number(match[3]), month: Number(match[2]) } : null;
}

export function durationMinutes(entry: Entry): number {
  const [startHour, startMinute] = entry.start.split(":").map(Number);
  const [endHour, endMinute] = entry.end.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

export function formattedDuration(entry: Entry): string {
  const minutes = durationMinutes(entry);
  return minutes > 0 ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}` : "-";
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 мин";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} ч${rest ? ` ${rest} мин` : ""}` : `${rest} мин`;
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

export function createEntry(year: number, month: number): Entry {
  const now = new Date();
  const day = year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : 1;
  return {
    id: crypto.randomUUID(),
    date: `${pad(day)}.${pad(month)}.${year}`,
    issueId: "",
    start: "09:00",
    end: "10:00",
    tracker: "Feature",
    subject: "",
    activity: "Code",
    comment: "",
    location: "Офис",
    synced: false
  };
}
