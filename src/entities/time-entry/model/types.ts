import { TRACKERS } from "src/shared/config/domain";

export type ActivityType = string;

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
  activityId?: number;
  comment: string;
  synced: boolean;
  redmineTimeEntryId?: number;
  createdAt?: string;
};
