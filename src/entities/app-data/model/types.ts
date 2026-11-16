import type { TimeEntry } from "src/entities/time-entry/@x/app-data";
import type { AppSettings } from "src/entities/settings/@x/app-data";
import type { CustomIssueFilter } from "src/entities/issue-filter/@x/app-data";
import type { StoredIssueEvent, PollCursor } from "src/entities/issue-event/@x/app-data";

export type AppData = {
  entries: TimeEntry[];
  settings: AppSettings;
  customFilters: CustomIssueFilter[];
};

export type AppBackup = {
  format: "redmine-reborn";
  version: 1;
  exportedAt: string;
  data: AppData;
  events: StoredIssueEvent[];
  cursors: PollCursor[];
};
