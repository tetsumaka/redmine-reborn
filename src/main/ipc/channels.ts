import type { IpcChannels } from "src/shared/types";

export const IPC_CHANNELS = {
  testNotification: "notifications:test",
  getNotificationStatus: "notifications:status",
  getDesktopNotifications: "notifications:list",
  closeDesktopNotification: "notifications:close",
  openDesktopNotification: "notifications:open",
  setDesktopNotificationsInteractive: "notifications:interactive",
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

export const NOTIFICATIONS_CHANGED = "notifications:changed";
