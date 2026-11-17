import { appDataStorage } from "src/entities/app-data";
import type { AppData } from "src/entities/app-data";
import * as redmine from "src/entities/redmine";
import { enqueueDataOperation, withEditingLocked } from "src/shared/lib/data-operations";
import type { RedminePullScope, SyncResult } from "./types";

function parseDate(value: string): Date {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) throw new Error("Некорректная дата синхронизации");
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) throw new Error("Некорректная дата синхронизации");
  return date;
}
function monthDates(value: string): string[] {
  const date = parseDate(value);
  return Array.from({ length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() }, (_, i) =>
    `${String(i + 1).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`);
}
function synchronize(date: string, operation: (data: AppData, settings: redmine.RedmineSettings, output: SyncResult) => Promise<void>): Promise<SyncResult> {
  return enqueueDataOperation(() => withEditingLocked(async () => {
    const output: SyncResult = { synced: 0, downloaded: 0, deleted: 0, errors: [] };
    try {
      parseDate(date);
      const data = await appDataStorage.read();
      await operation(data, await redmine.resolveRedmineSettings(data.settings), output);
    } catch (error) { output.errors.push({ id: date, message: error instanceof Error ? error.message : String(error) }); }
    return output;
  }));
}
async function sendEntries(data: AppData, settings: redmine.RedmineSettings, date: string, output: SyncResult): Promise<void> {
  for (const entry of data.entries.filter((item) => item.date === date && !item.synced)) {
    entry.redmineTimeEntryId = await redmine.syncEntry(entry, settings);
    entry.synced = true;
    await appDataStorage.write(data);
    output.synced++;
  }
}
export function sendToRedmine(date: string): Promise<SyncResult> {
  return synchronize(date, (data, settings, output) => sendEntries(data, settings, date, output));
}
export function pullFromRedmine(date: string, scope: RedminePullScope): Promise<SyncResult> {
  return synchronize(date, async (data, settings, output) => {
    if (scope !== "day" && scope !== "month") throw new Error("Некорректный режим загрузки");
    for (const current of scope === "month" ? monthDates(date) : [date]) {
      const remote = await redmine.loadDayEntries(current, settings, data.entries);
      data.entries = [...data.entries.filter((entry) => entry.date !== current || !entry.synced), ...remote];
      await appDataStorage.write(data);
      output.downloaded += remote.length;
    }
  });
}
export function overwriteRedmineDay(date: string): Promise<SyncResult> {
  return synchronize(date, async (data, settings, output) => {
    for (const entry of data.entries.filter((item) => item.date === date)) redmine.timeEntryActivityId(entry, settings);
    const remote = await redmine.loadDayEntries(date, settings, data.entries);
    for (const entry of remote) {
      if (!entry.redmineTimeEntryId) continue;
      await redmine.deleteTimeEntry(entry.redmineTimeEntryId, settings);
      for (const local of data.entries.filter((item) => item.redmineTimeEntryId === entry.redmineTimeEntryId)) {
        local.synced = false;
        delete local.redmineTimeEntryId;
      }
      await appDataStorage.write(data);
      output.deleted++;
    }
    for (const entry of data.entries.filter((item) => item.date === date)) {
      entry.synced = false;
      delete entry.redmineTimeEntryId;
    }
    await appDataStorage.write(data);
    await sendEntries(data, settings, date, output);
  });
}
