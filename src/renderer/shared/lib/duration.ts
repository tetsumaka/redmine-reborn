import { pad } from "src/renderer/shared/lib/date";

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 мин";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0
    ? `${hours} ч${rest ? ` ${rest} мин` : ""}`
    : `${rest} мин`;
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

export function parseDuration(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes > 0 ? minutes : null;
}

export function intervalDuration(start: string, end: string): number | null {
  const startMatch = /^(\d{2}):(\d{2})$/.exec(start);
  const endMatch = /^(\d{2}):(\d{2})$/.exec(end);
  if (!startMatch || !endMatch) return null;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  const minutes = endMinutes - startMinutes;
  return minutes > 0 ? minutes : null;
}

export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(rest)}`;
}
