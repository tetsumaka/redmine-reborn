import type { RedmineCertificate } from "src/shared/api/desktop";

export type AppSettings = {
  redmineUrl: string;
  apiKey: string;
  certificate: RedmineCertificate | null;
  activities: TimeEntryActivity[];
  customFields: IssueCustomField[];
  eventSources: EventSources;
  eventsPollingEnabled: boolean;
  notificationsEnabled: boolean;
  notificationPollIntervalSeconds: number;
};

export type IssueCustomField = { id: number; name: string };

export type EventSources = { assigned: boolean; qa: boolean; codeReviewer: boolean; watched: boolean };

export type TimeEntryActivity = { id: number; name: string; active: boolean; isDefault: boolean };
