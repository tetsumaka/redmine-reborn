import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import path from "node:path";
import { Store } from "./store";
import { deleteTimeEntry, loadDayEntries, loadIssue, loadIssues, loadIssueStatuses, syncEntry } from "./redmine";
import type { AppData, SyncResult } from "src/shared/types";
import { handleIpc } from "./ipc/handle";
import { DesktopNotifications } from "./notifications/desktop";
import { IssueNotificationListener } from "./notifications/listener";
import { NOTIFICATION_POSITIONS, MIN_NOTIFICATION_POLL_INTERVAL_SECONDS, MAX_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/constants";

const startedAt = Date.now();
const store = new Store();
const isDevelopment = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const appIcon = isDevelopment
  ? path.join(app.getAppPath(), "public/redmine-reborn.png")
  : path.join(__dirname, "../renderer/redmine-reborn.png");
let mainWindow: BrowserWindow | null = null;
let desktopNotifications: DesktopNotifications;
let notificationListener: IssueNotificationListener;

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
  mainWindow = window;
  window.on("closed", () => {
    mainWindow = null;
    desktopNotifications.destroy();
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
  desktopNotifications = new DesktopNotifications({
    preload: path.join(__dirname, "preload.js"),
    rendererUrl: isDevelopment ? rendererUrl : undefined,
    rendererFile: path.join(__dirname, "../renderer/index.html"),
    icon: appIcon,
  });
  notificationListener = new IssueNotificationListener(
    (event, redmineUrl) => {
      const url = new URL(`issues/${event.issueId}`, `${redmineUrl.replace(/\/+$/, "")}/`);
      url.hash = `change-${event.journalId}`;
      if (url.protocol === "https:" || url.protocol === "http:") {
        desktopNotifications.show({ issueId: event.issueId, title: event.title, message: event.message, comment: event.comment, issueUrl: url.toString() });
      }
    },
    startedAt,
  );
  handleIpc("testNotification", async () => {
    desktopNotifications.show({
      title: "Пример задачи для проверки уведомлений",
      message: "@user.name прокомментировал вашу задачу",
      comment: "Добавил комментарий к задаче. Так будет выглядеть его краткий текст в уведомлении.",
    });
  });
  handleIpc("getNotificationStatus", async () => notificationListener.getStatus());
  handleIpc("getDesktopNotifications", async (event) =>
    desktopNotifications.isNotificationWindow(event.sender.id) ? desktopNotifications.list() : { notifications: [], position: "bottom-right" as const },
  );
  handleIpc("closeDesktopNotification", async (event, id) => {
    if (desktopNotifications.isNotificationWindow(event.sender.id)) desktopNotifications.close(id);
  });
  handleIpc("openDesktopNotification", async (event, id) => {
    if (desktopNotifications.isNotificationWindow(event.sender.id)) await desktopNotifications.open(id);
  });
  handleIpc("setDesktopNotificationsInteractive", async (event, interactive) => {
    if (desktopNotifications.isNotificationWindow(event.sender.id)) desktopNotifications.setInteractive(interactive);
  });
  handleIpc("load", () => store.read());
  handleIpc("save", async (_event, data) => {
    const interval = data.settings.notificationPollIntervalSeconds;
    if (!Number.isInteger(interval) || interval < MIN_NOTIFICATION_POLL_INTERVAL_SECONDS || interval > MAX_NOTIFICATION_POLL_INTERVAL_SECONDS) {
      throw new Error(`Интервал проверки должен быть целым числом от ${MIN_NOTIFICATION_POLL_INTERVAL_SECONDS} до ${MAX_NOTIFICATION_POLL_INTERVAL_SECONDS} секунд`);
    }
    if (!NOTIFICATION_POSITIONS.includes(data.settings.notificationPosition)) throw new Error("Некорректное расположение уведомлений");
    await store.write(data);
    desktopNotifications.setPosition(data.settings.notificationPosition);
    notificationListener.configure(data.settings);
  });
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
  void store.read().then((data) => {
    desktopNotifications.setPosition(data.settings.notificationPosition);
    notificationListener.configure(data.settings);
  }).catch(console.error);
  app.on("activate", () => { if (!mainWindow) createWindow(); });
});

app.on("before-quit", () => {
  notificationListener?.stop();
  desktopNotifications?.destroy();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
