import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { Store } from "./store";
import { deleteTimeEntry, loadDayEntries, loadIssue, syncEntry } from "./redmine";
import { AppData } from "./types";

const store = new Store();
const isDevelopment = !app.isPackaged;

function isEntryOnDate(entry: AppData["entries"][number], date: string): boolean {
  return entry.date === date;
}

function replaceDateEntries(data: AppData, date: string, entries: AppData["entries"]): void {
  data.entries = [...data.entries.filter((entry) => !isEntryOnDate(entry, date)), ...entries];
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
  ipcMain.handle("redmine:sync", async (_event, date: string) => {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      throw new Error("Некорректная дата синхронизации");
    }
    const data = await store.read();
    const errors: Array<{ id: string; message: string }> = [];
    let synced = 0;
    let deleted = 0;
    let downloaded = 0;
    const localEntries = data.entries.filter((entry) => isEntryOnDate(entry, date));
    const hasUnsyncedEntries = localEntries.some((entry) => !entry.synced);

    try {
      if (localEntries.length === 0 || !hasUnsyncedEntries) {
        const remoteEntries = await loadDayEntries(date, data.settings, data.entries);
        replaceDateEntries(data, date, remoteEntries);
        downloaded = remoteEntries.length;
      } else {
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
      }
      await store.write(data);
    } catch (error) {
      errors.push({ id: "day", message: error instanceof Error ? error.message : String(error) });
    }
    return { synced, downloaded, deleted, errors };
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
