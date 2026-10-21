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

export type IssueEvent = {
  key: string;
  issueId: number;
  journalId: number;
  createdAt: number;
  title: string;
  message: string;
  comment?: string;
};

export type IssueEventsResult = {
  events: IssueEvent[];
  errors: string[];
};

export type IssueFilterSettings = {
  codeReviewerFieldId: string;
  qaFieldId: string;
  codeReviewStatusId: string;
  resolvedStatusId: string;
  feedbackStatusId: string;
};

export type RedmineNamedItem = { id: number; name: string; projectId?: number };

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
  columns: string[] | null;
  assignee: string;
  authorId: string;
  categoryId: string;
  categoryProjectId: string;
  qaId: string;
  codeReviewerId: string;
  parentIssueId: string;
  subject: string;
  watched: boolean;
  sortBy: string;
  sortDirection: "asc" | "desc";
};

export type CustomIssueFilter = {
  id: string;
  name: string;
  description: string;
  width: "1" | "1/2" | "1/3";
  pageSize: number;
  projectId: number | null;
  projectName: string;
  projectIdentifier: string;
  url: string;
  conditions: CustomIssueFilterConditions;
};

export type AppData = {
  entries: TimeEntry[];
  settings: AppSettings;
  customFilters: CustomIssueFilter[];
  issueTableColumns: IssueTableColumns;
};

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
  fixedVersion: string;
  parentId: number | null;
  parentSubject: string;
  author: string;
  category: string;
  startDate: string;
  dueDate: string;
  createdOn: string;
  updatedOn: string;
  closedOn: string;
  spentHours: number | null;
  estimatedHours: number | null;
  totalEstimatedHours: number | null;
  totalSpentHours: number | null;
  doneRatio: number | null;
  lastUpdatedBy: string;
  relations: number[];
  attachments: Array<{ id: number; filename: string; contentUrl: string }>;
  customFields: Record<string, { name: string; value: string }>;
};

export type IssueTableColumn = Exclude<keyof RedmineIssue, "id" | "customFields">;
export type IssueDisplayColumn = IssueTableColumn | `cf_${number}`;
export type IssueTableColumns = Partial<Record<IssueFilter, IssueTableColumn[]>>;

export type IssuePage = {
  issues: RedmineIssue[];
  totalCount: number;
  offset: number;
  limit: number;
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
  getCustomFilterIssues: {
    endpoint: "redmine:custom-filter-issues:list";
    args: [filterId: string, offset: number, limit: number];
    return: Promise<IssuePage>;
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
  getIssueEvents: {
    endpoint: "redmine:events:list";
    args: [from: number, to: number];
    return: Promise<IssueEventsResult>;
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
