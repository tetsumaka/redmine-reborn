import { contextBridge, ipcRenderer } from "electron";
import type { Api, DesktopNotificationState } from "src/shared/types";
import { invokeIpc } from "./ipc/invoke";
import { NOTIFICATIONS_CHANGED } from "./ipc/channels";

const api: Api = {
  testNotification: () => invokeIpc("testNotification"),
  getNotificationStatus: () => invokeIpc("getNotificationStatus"),
  getDesktopNotifications: () => invokeIpc("getDesktopNotifications"),
  closeDesktopNotification: (id) => invokeIpc("closeDesktopNotification", id),
  openDesktopNotification: (id) => invokeIpc("openDesktopNotification", id),
  setDesktopNotificationsInteractive: (interactive) => invokeIpc("setDesktopNotificationsInteractive", interactive),
  onDesktopNotificationsChanged: (listener) => {
    const receive = (_event: Electron.IpcRendererEvent, state: DesktopNotificationState) => listener(state);
    ipcRenderer.on(NOTIFICATIONS_CHANGED, receive);
    return () => { ipcRenderer.removeListener(NOTIFICATIONS_CHANGED, receive); };
  },
  load: () => invokeIpc("load"),
  save: (data) => invokeIpc("save", data),
  chooseCertificate: () => invokeIpc("chooseCertificate"),
  getIssue: (issueId) => invokeIpc("getIssue", issueId),
  getIssues: (filter) => invokeIpc("getIssues", filter),
  getIssueStatuses: () => invokeIpc("getIssueStatuses"),
  pullFromRedmine: (date, scope) => invokeIpc("pullFromRedmine", date, scope),
  overwriteRedmineDay: (date) => invokeIpc("overwriteRedmineDay", date),
};

contextBridge.exposeInMainWorld("api", api);
