import type { IpcChannels } from "src/shared/types";

export const IPC_CHANNELS = {
  load: "data:load",
  save: "data:save",
  chooseCertificate: "file:certificate",
  getIssue: "redmine:issue:get",
  getIssues: "redmine:issues:list",
  getIssueStatuses: "redmine:issue-statuses:list",
  pullFromRedmine: "redmine:pull",
  overwriteRedmineDay: "redmine:overwrite-day",
} as const satisfies {
  [Method in keyof IpcChannels]: IpcChannels[Method]["endpoint"];
};
