import type { IpcChannels } from "src/shared/types";

export const IPC_CHANNELS = {
  getCustomFilterIssues: "redmine:custom-filter-issues:list",
  getProjectCategories: "redmine:project-categories:list",
  getProjectVersions: "redmine:project-versions:list",
  getProjects: "redmine:projects:list",
  getIssuePriorities: "redmine:issue-priorities:list",
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
  getIssueEvents: "redmine:events:list",
  refreshIssueEvents: "redmine:events:refresh",
  getIssueStatuses: "redmine:issue-statuses:list",
  pullFromRedmine: "redmine:pull",
  overwriteRedmineDay: "redmine:overwrite-day",
} as const satisfies {
  [Method in keyof IpcChannels]: IpcChannels[Method]["endpoint"];
};

export const NOTIFICATIONS_CHANGED = "notifications:changed";
export const ISSUE_EVENTS_CHANGED = "events:changed";
