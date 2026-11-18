import { app, BrowserWindow, ipcMain, Menu, net, protocol, session, shell, dialog } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent, MenuItemConstructorOptions } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { desktopChannels, type DesktopResult, type NotificationMessage } from "../src/shared/api/desktop";
import { requestRedmine } from "./http";
import { PushNotifications } from "./push-notifications";
import { configureRequestLogging } from "./request-log";
import { chooseCertificate } from "./certificates";

const appUrl = "app://redmine-reborn/";
const rendererDirectory = path.join(__dirname, "../renderer");
const rendererUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined;
const isDevelopment = Boolean(rendererUrl);
if (rendererUrl) {
  const url = new URL(rendererUrl);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Сервер разработки должен работать на localhost");
  }
}
const icon = rendererUrl ? path.join(app.getAppPath(), "public/redmine-reborn.png") : path.join(rendererDirectory, "redmine-reborn.png");
let mainWindow: BrowserWindow | null = null;
let pushNotifications: PushNotifications;

app.setName("Redmine Reborn");
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

function trustedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const expected = new URL(rendererUrl ?? appUrl);
    return url.protocol === expected.protocol && url.host === expected.host
      && [expected.pathname, "/index.html"].includes(url.pathname || "/") && !url.username && !url.password;
  } catch { return false; }
}

function trustedSender(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
  return Boolean(mainWindow && event.sender === mainWindow.webContents && event.senderFrame
    && event.senderFrame === event.sender.mainFrame && trustedUrl(event.senderFrame.url));
}

function focusWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function toggleDevTools(): void {
  if (!mainWindow || !isDevelopment) return;
  if (mainWindow.webContents.isDevToolsOpened()) mainWindow.webContents.closeDevTools();
  else mainWindow.webContents.openDevTools({ mode: "right" });
}

function configureMenu(): void {
  if (!isDevelopment) { Menu.setApplicationMenu(null); return; }
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    { label: "Файл", submenu: [{ role: "close", label: "Закрыть окно" }, { role: "quit", label: "Выход" }] },
    { label: "Правка", submenu: [
      { role: "undo", label: "Отменить" }, { role: "redo", label: "Повторить" }, { type: "separator" },
      { role: "cut", label: "Вырезать" }, { role: "copy", label: "Копировать" }, { role: "paste", label: "Вставить" }, { role: "selectAll", label: "Выделить всё" },
    ] },
    { label: "Вид", submenu: [
      { role: "reload", label: "Перезагрузить" }, { role: "forceReload", label: "Перезагрузить без кэша" },
      { label: "Инструменты разработчика", accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Control+Shift+I", click: toggleDevTools },
      { type: "separator" }, { role: "resetZoom", label: "Сбросить масштаб" }, { role: "zoomIn", label: "Увеличить" }, { role: "zoomOut", label: "Уменьшить" },
      { type: "separator" }, { role: "togglefullscreen", label: "Полный экран" },
    ] },
    { label: "Окно", submenu: [{ role: "minimize", label: "Свернуть" }, { role: "zoom", label: "Развернуть" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openExternal(value: string): Promise<void> {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
    await shell.openExternal(url.toString());
  } catch { /* External navigation never replaces the application window. */ }
}

function showNotification(value: unknown): void {
  const message = value as NotificationMessage | null;
  if (!message || typeof message.title !== "string" || typeof message.body !== "string" || typeof message.tag !== "string"
    || (message.url !== undefined && typeof message.url !== "string") || (message.comment !== undefined && typeof message.comment !== "string")
    || (message.issueId !== undefined && (!Number.isSafeInteger(message.issueId) || message.issueId <= 0))) throw new Error("Некорректное уведомление");
  pushNotifications.show(message);
}

function registerIpc(): void {
  const handle = <T>(channel: string, operation: (value: unknown) => T | Promise<T>, authorize = trustedSender) => {
    ipcMain.handle(channel, async (event, value): Promise<DesktopResult<T>> => {
      if (!authorize(event)) return { ok: false, error: "Недоверенный источник запроса" };
      try { return { ok: true, value: await operation(value) }; }
      catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Не удалось выполнить операцию" }; }
    });
  };
  handle(desktopChannels.request, requestRedmine);
  handle(desktopChannels.chooseCertificate, () => chooseCertificate(mainWindow!));
  handle(desktopChannels.notify, showNotification);
  const popupSender = (event: IpcMainInvokeEvent | IpcMainEvent) => Boolean(event.senderFrame
    && event.senderFrame === event.sender.mainFrame && trustedUrl(event.senderFrame.url)
    && pushNotifications.isNotificationWindow(event.sender.id));
  const notificationId = (value: unknown) => {
    if (typeof value !== "string") throw new Error("Некорректный ID уведомления");
    return value;
  };
  handle(desktopChannels.pushList, () => pushNotifications.list(), popupSender);
  handle(desktopChannels.pushClose, (id) => pushNotifications.close(notificationId(id)), popupSender);
  handle(desktopChannels.pushOpen, (id) => pushNotifications.open(notificationId(id)), popupSender);
  handle(desktopChannels.pushInteractive, (interactive) => {
    if (typeof interactive !== "boolean") throw new Error("Некорректное состояние окна уведомлений");
    pushNotifications.setInteractive(interactive);
  }, popupSender);
}

function registerAppProtocol(): void {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    if (url.host !== "redmine-reborn" || !["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 404 });
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response(null, { status: 400 }); }
    const file = path.resolve(rendererDirectory, `.${pathname === "/" ? "/index.html" : pathname}`);
    const relative = path.relative(rendererDirectory, file);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return new Response(null, { status: 403 });
    try { return await net.fetch(pathToFileURL(file).toString()); }
    catch { return new Response(null, { status: 404 }); }
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1100, minHeight: 700,
    title: "Redmine Reborn", backgroundColor: "#09090b", icon, show: false,
    frame: true, minimizable: true, maximizable: true, closable: true, autoHideMenuBar: !isDevelopment,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true,
      backgroundThrottling: false,
      devTools: isDevelopment,
    },
  });
  mainWindow = window;
  if (isDevelopment) {
    window.setMenuBarVisibility(true);
    window.webContents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown" || input.key !== "F12" || input.isAutoRepeat) return;
      event.preventDefault();
      toggleDevTools();
    });
  }
  window.once("ready-to-show", () => window.show());
  window.once("closed", () => { mainWindow = null; pushNotifications.destroy(); });
  window.webContents.setWindowOpenHandler(({ url }) => { void openExternal(url); return { action: "deny" }; });
  window.webContents.on("will-navigate", (event, url) => {
    if (trustedUrl(url)) return;
    event.preventDefault();
    void openExternal(url);
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  void window.loadURL(rendererUrl ?? appUrl).catch(() => {
    dialog.showErrorBox("Redmine Reborn", "Не удалось загрузить интерфейс приложения. Пересоберите приложение и запустите его повторно.");
    app.quit();
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", focusWindow);
  app.on("window-all-closed", () => { app.quit(); });
  void app.whenReady().then(() => {
    app.setAppUserModelId("ru.redmine.reborn");
    configureMenu();
    configureRequestLogging({
      enabled: process.env.REDMINE_REQUEST_LOG === "1" || (isDevelopment && process.env.REDMINE_REQUEST_LOG !== "0"),
      forward: (entry) => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send(desktopChannels.requestLog, entry);
      },
    });
    pushNotifications = new PushNotifications({
      preload: path.join(__dirname, "../preload/preload.js"), rendererUrl: rendererUrl ?? appUrl,
      icon, openExternal, focusWindow,
    });
    registerIpc();
    registerAppProtocol();
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
      callback(permission === "persistent-storage" && trustedUrl(details.requestingUrl));
    });
    session.defaultSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) => {
      return permission === "persistent-storage" && trustedUrl(requestingOrigin);
    });
    createWindow();
  }).catch(() => { dialog.showErrorBox("Redmine Reborn", "Не удалось запустить приложение."); app.quit(); });
}
