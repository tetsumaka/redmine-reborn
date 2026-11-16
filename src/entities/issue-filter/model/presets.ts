import type { RedmineIssueStatus } from "src/entities/redmine/@x/issue-filter";
import type { AppSettings } from "src/entities/settings/@x/issue-filter";
import { defaultIssueColumns, emptyFilterConditions } from "../lib/conditions";

export const issueFilterPresets = [
  { id: "in-progress", name: "Выполняю задачу", description: "Назначено - Я & Статус - In Progress", statusName: "In Progress", userField: "assignee" },
  { id: "testing", name: "Тестирую задачу", description: "QA - Я & Статус - Testing", statusName: "Testing", userField: "qaId" },
  { id: "review", name: "Ждут ревью", description: "Code Reviewer - Я & Статус - Code Review", statusName: "Code Review", userField: "codeReviewerId" },
  { id: "resolved", name: "Ждут проверки", description: "QA - Я & Статус - Resolved", statusName: "Resolved", userField: "qaId" },
  { id: "feedback", name: "Ждут фидбека", description: "QA - Я & Статус - Feedback", statusName: "Feedback", userField: "qaId" },
  { id: "watched", name: "Отслеживаемые задачи", description: "Я - наблюдатель", statusName: null, userField: null },
] as const;

type FilterPreset = (typeof issueFilterPresets)[number];
const normalizeStatus = (name: string) => name.trim().toLowerCase().replace(/[\s_-]+/g, "");

export function presetStatus(preset: FilterPreset, statuses: readonly RedmineIssueStatus[]): RedmineIssueStatus | undefined {
  if (preset.statusName === null) return undefined;
  const matches = statuses.filter((status) => normalizeStatus(status.name) === normalizeStatus(preset.statusName));
  return matches.length === 1 ? matches[0] : undefined;
}

export function presetConditions(preset: FilterPreset, statuses: readonly RedmineIssueStatus[], settings: AppSettings) {
  if (preset.id === "watched") {
    return { ...emptyFilterConditions(), watched: true, statusId: "*", columns: defaultIssueColumns(settings) };
  }
  const status = presetStatus(preset, statuses);
  if (!status) throw new Error(`В Redmine не найден однозначный статус «${preset.statusName}»`);
  return { ...emptyFilterConditions(), statusId: String(status.id), [preset.userField]: "me", columns: ["priority", "subject"] };
}
