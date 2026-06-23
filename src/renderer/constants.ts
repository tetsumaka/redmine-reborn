export const TRACKERS = ["Question", "Bug", "Feature", "Enhancement", "Test", "Doc", "Time-tracking"] as const;

export const ACTIVITIES = [
  "Design",
  "Documentation",
  "Code",
  "Code Review",
  "Analysis",
  "Discuss",
  "Test",
  "Management",
  "Support"
] as const;

export const ACTIVITY_COLORS: Record<string, string> = {
  Design: "#f472b6",
  Documentation: "#a371f7",
  Code: "#58a6ff",
  "Code Review": "#39c5cf",
  Analysis: "#d29922",
  Discuss: "#db61a2",
  Test: "#3fb950",
  Management: "#f0883e",
  Support: "#8b949e"
};

export const ACTIVITY_ID_PLACEHOLDERS: Record<string, number> = {
  Design: 8,
  Code: 9,
  "Code Review": 90,
  Analysis: 96,
  Discuss: 10,
  Test: 11,
  Management: 12,
  Documentation: 13,
  Support: 14
};

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
] as const;
