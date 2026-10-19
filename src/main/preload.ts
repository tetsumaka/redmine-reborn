import { contextBridge } from "electron";
import type { Api } from "src/shared/types";
import { invokeIpc } from "./ipc/invoke";

const api: Api = {
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
