export type Entry = {
  id: string;
  date: string;
  issueId: string;
  start?: string;
  end?: string;
  minutes?: number;
  tracker: string;
  subject: string;
  estimatedHours?: number;
  activity: string;
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

export type IssueSummary = {
  id: number;
  tracker: string;
  subject: string;
  estimatedHours?: number;
};

export const defaultSettings: Settings = {
  redmineUrl: "",
  apiKey: "",
  userId: "",
  certificatePath: "",
  activityIds: {}
};
