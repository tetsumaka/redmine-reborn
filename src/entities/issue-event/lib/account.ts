import type { RedmineSettings } from "src/entities/redmine/@x/issue-event";

export function eventAccount(settings: RedmineSettings): string {
  return JSON.stringify([settings.redmineUrl.trim().replace(/\/+$/, ""), settings.userId.trim()]);
}

export function assertEventRange(from: number, to: number): void {
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from >= to ||
      !Number.isFinite(new Date(from).getTime()) || !Number.isFinite(new Date(to).getTime())) {
    throw new Error("Некорректный период событий");
  }
}
