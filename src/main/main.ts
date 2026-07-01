import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { Store } from "./store";
import { deleteTimeEntry, loadDayEntries, loadIssue, syncEntry } from "./redmine";
import { AppData } from "./types";

type SyncResult = {
  synced: number;
  downloaded: number;
  deleted: number;
  errors: Array<{ id: string; message: string }>;
};

const store = new Store();
const isDevelopment = !app.isPackaged;

function assertDisplayDate(date: string): void {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
    throw new Error("Некорректная дата синхронизации");
  }
}

function displayDateToDate(value: string): Date {
  assertDisplayDate(value);
  const [day, month, year] = value.split(".").map(Number);
  return new Date(year, month - 1, day);
}

function dateToDisplayDate(value: Date): string {
  return `${String(value.getDate()).padStart(2, "0")}.${String(value.getMonth() + 1).padStart(2, "0")}.${value.getFullYear()}`;
}

function monthDatesFor(selectedDate: string): string[] {
  const date = displayDateToDate(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) =>
    dateToDisplayDate(new Date(year, month, index + 1)),
  );
}

function isEntryOnDate(entry: AppData["entries"][number], date: string): boolean {
  return entry.date === date;
}

function replaceDateEntries(data: AppData, date: string, entries: AppData["entries"]): void {
  data.entries = [...data.entries.filter((entry) => !isEntryOnDate(entry, date)), ...entries];
}

function mergeDownloadedDateEntries(data: AppData, date: string, remoteEntries: AppData["entries"]): void {
  const localOnlyEntries = data.entries.filter((entry) => isEntryOnDate(entry, date) && !entry.synced);
  replaceDateEntries(data, date, [...localOnlyEntries, ...remoteEntries]);
}

async function pullDateFromRedmine(data: AppData, date: string): Promise<number> {
  const remoteEntries = await loadDayEntries(date, data.settings, data.entries);
  mergeDownloadedDateEntries(data, date, remoteEntries);
  return remoteEntries.length;
}

async function overwriteDayInRedmine(data: AppData, date: string): Promise<SyncResult> {
  const errors: SyncResult["errors"] = [];
  let synced = 0;
  let deleted = 0;
  let downloaded = 0;

  const localEntries = data.entries.filter((entry) => isEntryOnDate(entry, date));
  const remoteEntries = await loadDayEntries(date, data.settings, data.entries);

  for (const remoteEntry of remoteEntries) {
    if (!remoteEntry.redmineTimeEntryId) continue;
    await deleteTimeEntry(remoteEntry.redmineTimeEntryId, data.settings);
    deleted += 1;
  }

  const savedEntries: AppData["entries"] = [];
  for (const entry of localEntries) {
    try {
      const draft = { ...entry, redmineTimeEntryId: undefined };
      const redmineTimeEntryId = await syncEntry(draft, data.settings);
      savedEntries.push({ ...draft, redmineTimeEntryId, synced: true });
      synced += 1;
    } catch (error) {
      savedEntries.push({ ...entry, redmineTimeEntryId: undefined, synced: false });
      errors.push({ id: entry.id, message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (errors.length === 0) {
    const remoteAfterSave = await loadDayEntries(date, data.settings, savedEntries);
    replaceDateEntries(data, date, remoteAfterSave);
    downloaded = remoteAfterSave.length;
  } else {
    replaceDateEntries(data, date, savedEntries);
  }

  return { synced, downloaded, deleted, errors };
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    autoHideMenuBar: !isDevelopment,
    backgroundColor: "#0d1117",
    title: "Redmine Time Tracker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (!isDevelopment) {
    window.setMenuBarVisibility(false);
  }
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!/^https?:\/\//.test(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
  void window.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  if (!isDevelopment) {
    Menu.setApplicationMenu(null);
  }
  ipcMain.handle("data:load", () => store.read());
  ipcMain.handle("data:save", (_event, data: AppData) => store.write(data));
  ipcMain.handle("redmine:issue:get", async (_event, issueId: string) => {
    const data = await store.read();
    return loadIssue(String(issueId ?? ""), data.settings);
  });
  ipcMain.handle("file:certificate", async () => {
    const result = await dialog.showOpenDialog({
      title: "Выберите сертификат",
      properties: ["openFile"],
      filters: [{ name: "CA-сертификаты", extensions: ["pem", "crt", "cer"] }]
    });
    return result.canceled ? "" : result.filePaths[0];
  });
  ipcMain.handle("redmine:pull", async (_event, date: string, scope: string) => {
    const result: SyncResult = { synced: 0, downloaded: 0, deleted: 0, errors: [] };
    try {
      assertDisplayDate(date);
      if (scope !== "day" && scope !== "month") {
        throw new Error("Некорректный режим обновления из Redmine");
      }
      const data = await store.read();
      const dates = scope === "month" ? monthDatesFor(date) : [date];
      for (const currentDate of dates) {
        result.downloaded += await pullDateFromRedmine(data, currentDate);
      }
      await store.write(data);
    } catch (error) {
      result.errors.push({ id: scope, message: error instanceof Error ? error.message : String(error) });
    }
    return result;
  });
  ipcMain.handle("redmine:overwrite-day", async (_event, date: string) => {
    const result: SyncResult = { synced: 0, downloaded: 0, deleted: 0, errors: [] };
    try {
      assertDisplayDate(date);
      const data = await store.read();
      const overwriteResult = await overwriteDayInRedmine(data, date);
      Object.assign(result, overwriteResult);
      await store.write(data);
    } catch (error) {
      result.errors.push({ id: "day", message: error instanceof Error ? error.message : String(error) });
    }
    return result;
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
