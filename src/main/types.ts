import type { AppSettings } from "src/shared/types";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/constants";

export type {
  AppData,
  TimeEntry,
  IssueSummary,
  AppSettings,
} from "src/shared/types";

export const defaultSettings: AppSettings = {
  redmineUrl: "",
  apiKey: "",
  userId: "",
  certificatePath: "",
  activityIds: {},
  notificationsEnabled: true,
  notificationPollIntervalSeconds: DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS,
  notificationPosition: "bottom-right",
  issueFilters: {
    codeReviewerFieldId: "6",
    qaFieldId: "2",
    codeReviewStatusId: "11",
    resolvedStatusId: "3",
    feedbackStatusId: "13",
  },
};
