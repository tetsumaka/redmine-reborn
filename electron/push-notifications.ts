import { BrowserWindow, screen } from "electron";
import { randomUUID } from "node:crypto";
import { desktopChannels, type DesktopNotification, type DesktopNotificationState, type NotificationMessage } from "../src/shared/api/desktop";
import { DESKTOP_NOTIFICATION_HEIGHT, DESKTOP_NOTIFICATION_GAP, DESKTOP_NOTIFICATION_MAX_VISIBLE, DESKTOP_NOTIFICATION_INTERVAL } from "../src/shared/config/notifications";

type QueuedNotification = DesktopNotification & { tag: string };

export class PushNotifications {
  private window: BrowserWindow | null = null;
  private items: QueuedNotification[] = [];
  private pending: QueuedNotification[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private deliveryTimer: ReturnType<typeof setTimeout> | undefined;
  private nextDeliveryAt = 0;

  constructor(private options: { preload: string; rendererUrl: string; icon: string; openExternal: (url: string) => Promise<void>; focusWindow: () => void }) {}

  isNotificationWindow(senderId: number): boolean { return this.window?.webContents.id === senderId; }

  list(): DesktopNotificationState {
    return { notifications: this.items.map(({ tag: _tag, ...item }) => ({ ...item })), position: "bottom-right" };
  }

  setInteractive(interactive: boolean): void {
    const ignore = process.platform === "linux" ? this.items.length === 0 : !interactive;
    this.window?.setIgnoreMouseEvents(ignore, { forward: true });
  }

  show(message: NotificationMessage): void {
    const suffix = message.issueId ? ` #${message.issueId}` : "";
    const item = {
      id: randomUUID(), tag: message.tag, title: message.body,
      message: suffix && message.title.endsWith(suffix) ? message.title.slice(0, -suffix.length) : message.title,
      issueId: message.issueId, issueUrl: message.url, comment: message.comment,
    };
    const visibleIndex = this.items.findIndex((current) => current.tag === message.tag);
    if (visibleIndex >= 0) {
      const id = this.items[visibleIndex].id;
      this.items[visibleIndex] = { ...item, id };
      clearTimeout(this.timers.get(id));
      this.timers.set(id, setTimeout(() => this.close(id), 10_000));
      this.publish();
      return;
    }
    const pendingIndex = this.pending.findIndex((current) => current.tag === message.tag);
    if (pendingIndex >= 0) this.pending[pendingIndex] = { ...item, id: this.pending[pendingIndex].id };
    else this.pending.push(item);
    this.deliverNext();
  }

  close(id: string): void {
    if (!this.items.some((item) => item.id === id)) return;
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.items = this.items.filter((item) => item.id !== id);
    this.nextDeliveryAt = Math.max(this.nextDeliveryAt, Date.now() + DESKTOP_NOTIFICATION_INTERVAL);
    this.publish();
    if (!this.items.length) {
      this.setInteractive(false);
      if (!this.pending.length) this.hideTimer = setTimeout(() => this.window?.hide(), DESKTOP_NOTIFICATION_INTERVAL);
    }
    this.deliverNext();
  }

  async open(id: string): Promise<void> {
    const item = this.items.find((notification) => notification.id === id);
    if (!item) return;
    if (item.issueUrl) await this.options.openExternal(item.issueUrl);
    else this.options.focusWindow();
    this.close(id);
  }

  destroy(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.deliveryTimer);
    this.deliveryTimer = undefined;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.items = [];
    this.pending = [];
    this.nextDeliveryAt = 0;
    this.window?.destroy();
    this.window = null;
  }

  private deliverNext(): void {
    if (this.deliveryTimer !== undefined || !this.pending.length || this.items.length >= DESKTOP_NOTIFICATION_MAX_VISIBLE) return;
    const delay = Math.max(0, this.nextDeliveryAt - Date.now());
    if (delay) {
      this.deliveryTimer = setTimeout(() => { this.deliveryTimer = undefined; this.deliverNext(); }, delay);
      return;
    }
    clearTimeout(this.hideTimer);
    if (!this.items.length && this.window) this.window.setBounds(this.bounds(), false);
    const item = this.pending.shift()!;
    this.items.push(item);
    this.nextDeliveryAt = Date.now() + DESKTOP_NOTIFICATION_INTERVAL;
    this.timers.set(item.id, setTimeout(() => this.close(item.id), 10_000));
    const window = this.ensureWindow();
    if (process.platform === "linux") this.setInteractive(true);
    this.publish();
    if (!window.webContents.isLoading()) window.showInactive();
    this.deliverNext();
  }

  private publish(): void {
    if (this.window && !this.window.isDestroyed()) this.window.webContents.send(desktopChannels.pushChanged, this.list());
  }

  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const window = new BrowserWindow({
      ...this.bounds(), frame: false, transparent: true, backgroundColor: "#00000000",
      alwaysOnTop: true, skipTaskbar: true, focusable: false, resizable: false, movable: false,
      minimizable: false, maximizable: false, show: false, hasShadow: false,
      title: "Уведомления Redmine Reborn", icon: this.options.icon,
      webPreferences: { preload: this.options.preload, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
    });
    window.setMenu(null);
    this.window = window;
    this.setInteractive(false);
    window.setAlwaysOnTop(true, "pop-up-menu");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.webContents.on("will-attach-webview", (event) => event.preventDefault());
    window.once("ready-to-show", () => {
      this.publish();
      if (this.items.length) window.showInactive();
    });
    window.once("closed", () => { if (this.window === window) this.window = null; });
    const url = new URL(this.options.rendererUrl);
    url.searchParams.set("view", "notifications");
    void window.loadURL(url.toString()).catch(() => this.destroy());
    return window;
  }

  private bounds(): { x: number; y: number; width: number; height: number } {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const width = Math.min(392, area.width - 24);
    const height = Math.min(DESKTOP_NOTIFICATION_MAX_VISIBLE * DESKTOP_NOTIFICATION_HEIGHT + (DESKTOP_NOTIFICATION_MAX_VISIBLE - 1) * DESKTOP_NOTIFICATION_GAP + 64, area.height - 24);
    return { x: area.x + area.width - width - 12, y: area.y + area.height - height - 12, width, height };
  }
}
