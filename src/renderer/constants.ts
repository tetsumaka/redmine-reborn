import { ActivityType, TrackerType } from "src/shared/types";

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Design: "#f472b6",
  Documentation: "#a371f7",
  Code: "#58a6ff",
  "Code Review": "#39c5cf",
  Analysis: "#d29922",
  Discuss: "#db61a2",
  Test: "#3fb950",
  Management: "#f0883e",
  Support: "#8b949e",
};

export const ACTIVITY_ID_PLACEHOLDERS: Record<ActivityType, number> = {
  Design: 8,
  Code: 9,
  "Code Review": 90,
  Analysis: 96,
  Discuss: 10,
  Test: 11,
  Management: 12,
  Documentation: 13,
  Support: 14,
};

export const TRACKER_COLORS: Record<TrackerType, string> = {
  Bug: "#ef4444",
  Feature: "#22c55e",
  Enhancement: "#eab308",
  Question: "#38bdf8",
  Test: "#f97316",
  Doc: "#14b8a6",
  "Time-tracking": "#a855f7",
};

export const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;
