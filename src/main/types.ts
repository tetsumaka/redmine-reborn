import type { AppSettings } from "src/shared/types";

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
  issueFilters: {
    codeReviewerFieldId: "6",
    qaFieldId: "2",
    codeReviewStatusId: "11",
    resolvedStatusId: "3",
    feedbackStatusId: "13",
  },
};
