import { BrowserWindow, screen, shell } from "electron";
import { randomUUID } from "node:crypto";
import type { DesktopNotification, DesktopNotificationState, NotificationPosition } from "src/shared/types";
import { DESKTOP_NOTIFICATION_HEIGHT, DESKTOP_NOTIFICATION_GAP, DESKTOP_NOTIFICATION_MAX_VISIBLE } from "src/shared/constants";
import { NOTIFICATIONS_CHANGED } from "../ipc/channels";

export class DesktopNotifications {
  private window: BrowserWindow | null = null;
  private items: DesktopNotification[] = [];
  private position: NotificationPosition = "bottom-right";
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private options: { preload: string; rendererUrl?: string; rendererFile: string; icon: string }) {}

  isNotificationWindow(senderId: number): boolean {
    return this.window?.webContents.id === senderId;
  }

  list(): DesktopNotificationState {
    return { notifications: this.items.map((item) => ({ ...item })), position: this.position };
  }

  setPosition(position: NotificationPosition): void {
    if (position === this.position) return;
    this.position = position;
    if (this.window) this.positionWindow(this.window);
    this.publish();
  }

  setInteractive(interactive: boolean): void {
    this.window?.setIgnoreMouseEvents(!interactive, { forward: true });
  }

  show(notification: Omit<DesktopNotification, "id">): void {
    clearTimeout(this.hideTimer);
    if (!this.items.length && this.window) this.positionWindow(this.window);
    const item: DesktopNotification = { ...notification, id: randomUUID() };
    this.items.push(item);
    while (this.items.length > DESKTOP_NOTIFICATION_MAX_VISIBLE) {
      const removed = this.items.shift()!;
      clearTimeout(this.timers.get(removed.id));
      this.timers.delete(removed.id);
    }
    this.timers.set(item.id, setTimeout(() => this.close(item.id), 10_000));
    const window = this.ensureWindow();
    this.publish();
    if (!window.webContents.isLoading()) window.showInactive();
  }

  close(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.items = this.items.filter((item) => item.id !== id);
    this.publish();
    if (!this.items.length) {
      this.setInteractive(false);
      this.hideTimer = setTimeout(() => this.window?.hide(), 350);
    }
  }

  async open(id: string): Promise<void> {
    const item = this.items.find((notification) => notification.id === id);
    if (item?.issueUrl) await shell.openExternal(item.issueUrl);
    this.close(id);
  }

  destroy(): void {
    clearTimeout(this.hideTimer);
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.items = [];
    this.window?.destroy();
    this.window = null;
  }

  private publish(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(NOTIFICATIONS_CHANGED, this.list());
    }
  }

  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const window = new BrowserWindow({
      ...this.bounds(),
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      show: false,
      hasShadow: false,
      title: "Уведомления Redmine Reborn",
      icon: this.options.icon,
      webPreferences: {
        preload: this.options.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    this.window = window;
    // Transparent space must not intercept clicks on the desktop underneath it.
    window.setIgnoreMouseEvents(true, { forward: true });
    window.setAlwaysOnTop(true, "pop-up-menu");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.once("ready-to-show", () => {
      this.publish();
      if (this.items.length) window.showInactive();
    });
    window.on("closed", () => { if (this.window === window) this.window = null; });
    if (this.options.rendererUrl) {
      const url = new URL(this.options.rendererUrl);
      url.searchParams.set("view", "notifications");
      void window.loadURL(url.toString());
    } else {
      void window.loadFile(this.options.rendererFile, { query: { view: "notifications" } });
    }
    return window;
  }

  private positionWindow(window: BrowserWindow): void {
    window.setBounds(this.bounds(), false);
  }

  private bounds(): { x: number; y: number; width: number; height: number } {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const width = Math.min(392, area.width - 24);
    const height = Math.min(
      DESKTOP_NOTIFICATION_MAX_VISIBLE * DESKTOP_NOTIFICATION_HEIGHT +
      (DESKTOP_NOTIFICATION_MAX_VISIBLE - 1) * DESKTOP_NOTIFICATION_GAP + 64,
      area.height - 24,
    );
    return {
      x: this.position.endsWith("right") ? area.x + area.width - width - 12 : area.x + 12,
      y: this.position.startsWith("top") ? area.y + 12 : area.y + area.height - height - 12,
      width,
      height,
    };
  }
}
