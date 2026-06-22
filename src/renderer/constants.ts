export const TRACKERS = ["Question", "Bug", "Feature", "Enhancement", "Test", "Doc", "Time-tracking"] as const;

export const ACTIVITIES = [
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
  Documentation: "#a371f7",
  Code: "#58a6ff",
  "Code Review": "#39c5cf",
  Analysis: "#d29922",
  Discuss: "#db61a2",
  Test: "#3fb950",
  Management: "#f0883e",
  Support: "#8b949e"
};

export const LOCATIONS = ["Офис", "Дом"] as const;

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
] as const;
