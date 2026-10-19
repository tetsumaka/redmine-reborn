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
};
