import { ACTIVITIES, TRACKERS } from "./constants";

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
};

export type AppData = { entries: TimeEntry[]; settings: AppSettings };

export type IssueSummary = {
  id: number;
  tracker: TrackerType;
  subject: string;
  estimatedHours?: number;
};

export type RedminePullScope = "day" | "month";

export type SyncResult = {
  synced: number;
  downloaded: number;
  deleted: number;
  errors: Array<{ id: string; message: string }>;
};

export type Api = {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  chooseCertificate(): Promise<string>;
  getIssue(issueId: string): Promise<IssueSummary>;
  pullFromRedmine(date: string, scope: RedminePullScope): Promise<SyncResult>;
  overwriteRedmineDay(date: string): Promise<SyncResult>;
};
