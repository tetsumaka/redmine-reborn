import { contextBridge, ipcRenderer } from "electron";
import { desktopChannels, desktopValue, type DesktopApi, type DesktopResult, type DesktopNotificationState, type PushNotificationsApi, type RequestLogEntry } from "../src/shared/api/desktop";

if (new URLSearchParams(location.search).get("view") === "notifications") {
  const invoke = <T>(channel: string, value?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, value).then((result: DesktopResult<T>) => desktopValue(result));
  const api: PushNotificationsApi = {
    list: () => invoke<DesktopNotificationState>(desktopChannels.pushList),
    close: (id) => invoke<void>(desktopChannels.pushClose, id),
    open: (id) => invoke<void>(desktopChannels.pushOpen, id),
    setInteractive: (interactive) => invoke<void>(desktopChannels.pushInteractive, interactive),
    onChanged: (listener) => {
      const receive = (_event: Electron.IpcRendererEvent, state: DesktopNotificationState) => listener(state);
      ipcRenderer.on(desktopChannels.pushChanged, receive);
      return () => { ipcRenderer.removeListener(desktopChannels.pushChanged, receive); };
    },
  };
  contextBridge.exposeInMainWorld("redminePush", api);
} else {
  ipcRenderer.on(desktopChannels.requestLog, (_event, entry: RequestLogEntry) => {
    const method = entry.phase === "error" ? "error" : entry.phase === "response" && !entry.ok ? "warn" : "info";
    const result = entry.phase === "request" ? "→" : entry.phase === "error" ? "ERROR" : `HTTP ${entry.status}`;
    console[method](`[Redmine] #${entry.id} ${result} ${entry.method} ${entry.url}`, entry);
  });
  const api: DesktopApi = {
    request: (request) => ipcRenderer.invoke(desktopChannels.request, request),
    chooseCertificate: () => ipcRenderer.invoke(desktopChannels.chooseCertificate),
    notify: (message) => ipcRenderer.invoke(desktopChannels.notify, message),
  };
  contextBridge.exposeInMainWorld("redmineDesktop", api);
}
