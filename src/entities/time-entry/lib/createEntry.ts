import type { ActivityType, TrackerType, TimeEntry } from "src/entities/time-entry/model/types";

export function createEntry(
  date: string,
  input: {
    issueId: string;
    activity: ActivityType;
    activityId?: number;
    comment: string;
    minutes: number;
    start?: string;
    end?: string;
    tracker?: TrackerType;
    subject?: string;
    estimatedHours?: number;
  },
): TimeEntry {
  return {
    id: crypto.randomUUID(),
    date,
    issueId: input.issueId.trim(),
    start: input.start,
    end: input.end,
    minutes: input.minutes,
    tracker: input.tracker || "Feature",
    subject: input.subject?.trim() || "",
    estimatedHours: Number.isFinite(input.estimatedHours)
      ? input.estimatedHours
      : undefined,
    activity: input.activity,
    activityId: input.activityId,
    comment: input.comment.trim(),
    synced: false,
    createdAt: new Date().toISOString(),
  };
}
