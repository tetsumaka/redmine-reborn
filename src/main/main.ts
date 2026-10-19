import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import path from "node:path";
import { Store } from "./store";
import { deleteTimeEntry, loadDayEntries, loadIssue, loadIssues, loadIssueStatuses, syncEntry } from "./redmine";
import type { AppData, SyncResult } from "src/shared/types";
import { handleIpc } from "./ipc/handle";

const store = new Store();
const isDevelopment = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const appIcon = isDevelopment
  ? path.join(app.getAppPath(), "public/redmine-reborn.png")
  : path.join(__dirname, "../renderer/redmine-reborn.png");

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
    title: "Redmine Reborn",
    icon: appIcon,
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
    if (rendererUrl && new URL(url).origin === new URL(rendererUrl).origin) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
  if (isDevelopment && rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("ru.redmine.reborn");
  app.dock?.setIcon(appIcon);
  if (!isDevelopment) {
    Menu.setApplicationMenu(null);
  }
  handleIpc("load", () => store.read());
  handleIpc("save", (_event, data) => store.write(data));
  handleIpc("getIssue", async (_event, issueId) => {
    const data = await store.read();
    return loadIssue(String(issueId ?? ""), data.settings);
  });
  handleIpc("getIssues", async (_event, filter) => {
    const data = await store.read();
    return loadIssues(filter, data.settings);
  });
  handleIpc("getIssueStatuses", async () => {
    const data = await store.read();
    return loadIssueStatuses(data.settings);
  });
  handleIpc("chooseCertificate", async () => {
    const result = await dialog.showOpenDialog({
      title: "Выберите сертификат",
      properties: ["openFile"],
      filters: [{ name: "CA-сертификаты", extensions: ["pem", "crt", "cer"] }]
    });
    return result.canceled ? "" : result.filePaths[0];
  });
  handleIpc("pullFromRedmine", async (_event, date, scope) => {
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
  handleIpc("overwriteRedmineDay", async (_event, date) => {
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
