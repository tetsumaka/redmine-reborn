import { ACTIVITIES, TRACKERS, NOTIFICATION_POSITIONS } from "./constants";

export type ActivityType = (typeof ACTIVITIES)[number];
export type TrackerType = (typeof TRACKERS)[number];

export type TimeEntry = {
  id: string;
  date: string;
  issueId: string;
  start?: string;
  end?: string;
  minutes?: number;
  tracker: TrackerType;
  subject: string;
  estimatedHours?: number;
  activity: ActivityType;
  comment: string;
  synced: boolean;
  redmineTimeEntryId?: number;
  createdAt?: string;
};

export type AppSettings = {
  redmineUrl: string;
  apiKey: string;
  userId: string;
  certificatePath: string;
  activityIds: Record<string, number>;
  issueFilters: IssueFilterSettings;
  notificationsEnabled: boolean;
  notificationPollIntervalSeconds: number;
  notificationPosition: NotificationPosition;
};

export type NotificationPosition = (typeof NOTIFICATION_POSITIONS)[number];

export type DesktopNotification = {
  id: string;
  title: string;
  message: string;
  comment?: string;
  issueId?: number;
  issueUrl?: string;
};

export type DesktopNotificationState = {
  notifications: DesktopNotification[];
  position: NotificationPosition;
};

export type NotificationListenerStatus = {
  enabled: boolean;
  lastCheckedAt: string | null;
  error: string | null;
};

export type IssueFilterSettings = {
  codeReviewerFieldId: string;
  qaFieldId: string;
  codeReviewStatusId: string;
  resolvedStatusId: string;
  feedbackStatusId: string;
};

export type RedmineNamedItem = { id: number; name: string };

export type RedmineProject = {
  id: number;
  name: string;
  identifier: string;
  trackers: RedmineNamedItem[];
};

export type CustomIssueFilterConditions = {
  statusId: string;
  trackerId: string;
  priorityId: string;
  fixedVersionId: string;
  groupBy: string;
  assignee: string;
  authorId: string;
  categoryId: string;
  qaId: string;
  codeReviewerId: string;
  parentIssueId: string;
  subject: string;
  watched: boolean;
};

export type CustomIssueFilter = {
  id: string;
  name: string;
  projectId: number;
  projectName: string;
  projectIdentifier: string;
  url: string;
  conditions: CustomIssueFilterConditions;
};

export type AppData = { entries: TimeEntry[]; settings: AppSettings; customFilters: CustomIssueFilter[] };

export type IssueSummary = {
  id: number;
  tracker: TrackerType;
  subject: string;
  estimatedHours?: number;
};

export type IssueFilter =
  | "assigned"
  | "watched"
  | "codeReview"
  | "qaResolved"
  | "qaFeedback";

export type RedmineIssue = {
  id: number;
  subject: string;
  project: string;
  tracker: string;
  status: string;
  priority: string;
  assignedTo: string;
};

export type RedmineIssueStatus = {
  id: number;
  name: string;
  is_closed: boolean;
};

export type RedminePullScope = "day" | "month";

export type SyncResult = {
  synced: number;
  downloaded: number;
  deleted: number;
  errors: Array<{ id: string; message: string }>;
};

export interface IpcChannels {
  getProjectUsers: {
    endpoint: "redmine:project-users:list";
    args: [projectId: number];
    return: Promise<RedmineNamedItem[]>;
  };
  getProjectCategories: {
    endpoint: "redmine:project-categories:list";
    args: [projectId: number];
    return: Promise<RedmineNamedItem[]>;
  };
  getProjectVersions: {
    endpoint: "redmine:project-versions:list";
    args: [projectId: number];
    return: Promise<RedmineNamedItem[]>;
  };
  getProjects: {
    endpoint: "redmine:projects:list";
    args: [];
    return: Promise<RedmineProject[]>;
  };
  getIssuePriorities: {
    endpoint: "redmine:issue-priorities:list";
    args: [];
    return: Promise<RedmineNamedItem[]>;
  };
  testNotification: {
    endpoint: "notifications:test";
    args: [];
    return: Promise<void>;
  };
  getNotificationStatus: {
    endpoint: "notifications:status";
    args: [];
    return: Promise<NotificationListenerStatus>;
  };
  getDesktopNotifications: {
    endpoint: "notifications:list";
    args: [];
    return: Promise<DesktopNotificationState>;
  };
  closeDesktopNotification: {
    endpoint: "notifications:close";
    args: [id: string];
    return: Promise<void>;
  };
  openDesktopNotification: {
    endpoint: "notifications:open";
    args: [id: string];
    return: Promise<void>;
  };
  setDesktopNotificationsInteractive: {
    endpoint: "notifications:interactive";
    args: [interactive: boolean];
    return: Promise<void>;
  };
  load: {
    endpoint: "data:load";
    args: [];
    return: Promise<AppData>;
  };
  save: {
    endpoint: "data:save";
    args: [data: AppData];
    return: Promise<void>;
  };
  chooseCertificate: {
    endpoint: "file:certificate";
    args: [];
    return: Promise<string>;
  };
  getIssue: {
    endpoint: "redmine:issue:get";
    args: [issueId: string];
    return: Promise<IssueSummary>;
  };
  getIssues: {
    endpoint: "redmine:issues:list";
    args: [filter: IssueFilter];
    return: Promise<RedmineIssue[]>;
  };
  getIssueStatuses: {
    endpoint: "redmine:issue-statuses:list";
    args: [];
    return: Promise<RedmineIssueStatus[]>;
  };
  pullFromRedmine: {
    endpoint: "redmine:pull";
    args: [date: string, scope: RedminePullScope];
    return: Promise<SyncResult>;
  };
  overwriteRedmineDay: {
    endpoint: "redmine:overwrite-day";
    args: [date: string];
    return: Promise<SyncResult>;
  };
}

export type Api = {
  [Method in keyof IpcChannels]: (
    ...args: IpcChannels[Method]["args"]
  ) => IpcChannels[Method]["return"];
} & {
  onDesktopNotificationsChanged: (listener: (state: DesktopNotificationState) => void) => () => void;
};
