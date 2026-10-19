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

export interface IpcChannels {
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
};
