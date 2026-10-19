import { contextBridge, ipcRenderer } from "electron";
import type { Api } from "src/shared/types";

const api: Api = {
  load: () => ipcRenderer.invoke("data:load"),
  save: (data) => ipcRenderer.invoke("data:save", data),
  chooseCertificate: () => ipcRenderer.invoke("file:certificate"),
  getIssue: (issueId) => ipcRenderer.invoke("redmine:issue:get", issueId),
  pullFromRedmine: (date, scope) => ipcRenderer.invoke("redmine:pull", date, scope),
  overwriteRedmineDay: (date) => ipcRenderer.invoke("redmine:overwrite-day", date),
};

contextBridge.exposeInMainWorld("api", api);
