export type AppSettings = {
  redmineUrl: string;
  apiKey: string;
  activityIds: Record<string, number>;
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
