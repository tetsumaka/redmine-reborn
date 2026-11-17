export type AppSettings = {
  redmineUrl: string;
  apiKey: string;
  activities: TimeEntryActivity[];
  issueFilters: IssueFilterSettings;
  eventSources: EventSources;
  eventsPollingEnabled: boolean;
  notificationsEnabled: boolean;
  notificationPollIntervalSeconds: number;
};

export type IssueFilterSettings = {
  codeReviewerFieldId: string;
  qaFieldId: string;
};

export type EventSources = { assigned: boolean; qa: boolean; codeReviewer: boolean; watched: boolean };

export type TimeEntryActivity = { id: number; name: string; active: boolean; isDefault: boolean };
