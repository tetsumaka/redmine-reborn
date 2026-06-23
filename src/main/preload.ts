import { contextBridge, ipcRenderer } from "electron";
import { AppData } from "./types";

contextBridge.exposeInMainWorld("timeTracker", {
  load: (): Promise<AppData> => ipcRenderer.invoke("data:load"),
  save: (data: AppData): Promise<void> => ipcRenderer.invoke("data:save", data),
  chooseCertificate: (): Promise<string> => ipcRenderer.invoke("file:certificate"),
  sync: (date: string): Promise<{ synced: number; downloaded: number; deleted: number; errors: Array<{ id: string; message: string }> }> =>
    ipcRenderer.invoke("redmine:sync", date)
});
