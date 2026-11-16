export const ACTIVITIES = [
  "Design",
  "Documentation",
  "Code",
  "Code Review",
  "Analysis",
  "Discuss",
  "Test",
  "Management",
  "Support",
] as const;

export const TRACKERS = [
  "Question",
  "Bug",
  "Feature",
  "Enhancement",
  "Test",
  "Doc",
  "Time-tracking",
] as const;

export const DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS = 60;
export const MIN_NOTIFICATION_POLL_INTERVAL_SECONDS = 5;
export const MAX_NOTIFICATION_POLL_INTERVAL_SECONDS = 86_400;
