import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { Store } from "./store";
import { deleteTimeEntry, loadMonthEntries, syncEntry } from "./redmine";
import { AppData } from "./types";

const store = new Store();

function isEntryInMonth(entry: AppData["entries"][number], year: number, month: number): boolean {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry.date);
  return Boolean(match && Number(match[2]) === month && Number(match[3]) === year);
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: "#0d1117",
    title: "Redmine Time Tracker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  void window.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("data:load", () => store.read());
  ipcMain.handle("data:save", (_event, data: AppData) => store.write(data));
  ipcMain.handle("file:certificate", async () => {
    const result = await dialog.showOpenDialog({
      title: "Выберите сертификат",
      properties: ["openFile"],
      filters: [{ name: "CA-сертификаты", extensions: ["pem", "crt", "cer"] }]
    });
    return result.canceled ? "" : result.filePaths[0];
  });
  ipcMain.handle("redmine:sync", async (_event, year: number, month: number) => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Некорректный период синхронизации");
    }
    const data = await store.read();
    const pending = data.entries.filter((entry) => !entry.synced && isEntryInMonth(entry, year, month));
    const errors: Array<{ id: string; message: string }> = [];
    let synced = 0;
    for (const entry of pending) {
      try {
        if (entry.redmineTimeEntryId) {
          await deleteTimeEntry(entry.redmineTimeEntryId, data.settings);
          entry.redmineTimeEntryId = undefined;
          await store.write(data);
        }
        entry.redmineTimeEntryId = await syncEntry(entry, data.settings);
        entry.synced = true;
        synced += 1;
        await store.write(data);
      } catch (error) {
        errors.push({ id: entry.id, message: error instanceof Error ? error.message : String(error) });
      }
    }

    let downloaded = 0;
    try {
      const remoteEntries = await loadMonthEntries(year, month, data.settings, data.entries);
      const retainedEntries = data.entries.filter((entry) =>
        !isEntryInMonth(entry, year, month) || !entry.synced
      );
      const retainedRemoteIds = new Set(retainedEntries.flatMap((entry) =>
        entry.redmineTimeEntryId ? [entry.redmineTimeEntryId] : []
      ));
      const uniqueRemoteEntries = remoteEntries.filter((entry) =>
        !entry.redmineTimeEntryId || !retainedRemoteIds.has(entry.redmineTimeEntryId)
      );
      data.entries = [...retainedEntries, ...uniqueRemoteEntries];
      downloaded = remoteEntries.length;
      await store.write(data);
    } catch (error) {
      errors.push({ id: "month", message: error instanceof Error ? error.message : String(error) });
    }
    return { synced, downloaded, errors };
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
