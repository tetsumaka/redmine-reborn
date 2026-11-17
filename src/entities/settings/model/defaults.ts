import type { AppSettings } from "src/entities/settings/model/types";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/config/domain";

export const defaultSettings: AppSettings = {
  redmineUrl: "",
  apiKey: "",
  activities: [],
  eventSources: { assigned: true, qa: true, codeReviewer: true, watched: true },
  eventsPollingEnabled: true,
  notificationsEnabled: false,
  notificationPollIntervalSeconds: DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS,
  customFields: [],
};
