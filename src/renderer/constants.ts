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
  Documentation: "#8b5cf6",
  Code: "#2563eb",
  "Code Review": "#06b6d4",
  Analysis: "#f59e0b",
  Discuss: "#ec4899",
  Test: "#10b981",
  Management: "#f97316",
  Support: "#64748b"
};

export const LOCATIONS = ["Офис", "Дом"] as const;

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
] as const;
