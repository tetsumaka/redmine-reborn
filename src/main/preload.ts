import { contextBridge, ipcRenderer } from "electron";
import { AppData } from "./types";

contextBridge.exposeInMainWorld("timeTracker", {
  load: (): Promise<AppData> => ipcRenderer.invoke("data:load"),
  save: (data: AppData): Promise<void> => ipcRenderer.invoke("data:save", data),
  chooseCertificate: (): Promise<string> => ipcRenderer.invoke("file:certificate"),
  getIssue: (issueId: string) => ipcRenderer.invoke("redmine:issue:get", issueId),
  pullFromRedmine: (
    date: string,
    scope: "day" | "month",
  ): Promise<{ synced: number; downloaded: number; deleted: number; errors: Array<{ id: string; message: string }> }> =>
    ipcRenderer.invoke("redmine:pull", date, scope),
  overwriteRedmineDay: (date: string): Promise<{ synced: number; downloaded: number; deleted: number; errors: Array<{ id: string; message: string }> }> =>
    ipcRenderer.invoke("redmine:overwrite-day", date)
});
