import type { ActivityType, TrackerType } from "src/shared/types";

export type Entry = {
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
export type Settings = {
  redmineUrl: string;
  apiKey: string;
  userId: string;
  certificatePath: string;
  activityIds: Record<string, number>;
};
export type AppData = { entries: Entry[]; settings: Settings };
export type SyncResult = {
  synced: number;
  downloaded: number;
  deleted: number;
  errors: Array<{ id: string; message: string }>;
};
export type IssueSummary = {
  id: number;
  tracker: TrackerType;
  subject: string;
  estimatedHours?: number;
};

declare global {
  interface Window {
    timeTracker: {
      load(): Promise<AppData>;
      save(data: AppData): Promise<void>;
      chooseCertificate(): Promise<string>;
      getIssue(issueId: string): Promise<IssueSummary>;
      sync(date: string): Promise<SyncResult>;
    };
  }
}
