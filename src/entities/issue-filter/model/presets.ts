import type { RedmineIssueStatus } from "src/entities/redmine/@x/issue-filter";
import { roleCustomField, type AppSettings } from "src/entities/settings/@x/issue-filter";
import { emptyFilterConditions } from "../lib/conditions";

export const issueFilterPresets = [
  { id: "in-progress", name: "Выполняю задачу", description: "Назначено - Я & Статус - In Progress", statusName: "In Progress", userField: "assignee" },
  { id: "testing", name: "Тестирую задачу", description: "QA - Я & Статус - Testing", statusName: "Testing", userField: "qa" },
  { id: "review", name: "Ждут ревью", description: "Code Reviewer - Я & Статус - Code Review", statusName: "Code Review", userField: "codeReviewer" },
  { id: "resolved", name: "Ждут проверки", description: "QA - Я & Статус - Resolved", statusName: "Resolved", userField: "qa" },
  { id: "feedback", name: "Ждут фидбека", description: "QA - Я & Статус - Feedback", statusName: "Feedback", userField: "qa" },
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
    return { ...emptyFilterConditions(), watched: true, statusId: "o" };
  }
  const status = presetStatus(preset, statuses);
  if (!status) throw new Error(`В Redmine не найден однозначный статус «${preset.statusName}»`);
  const conditions = { ...emptyFilterConditions(), statusId: String(status.id), columns: ["priority", "subject"] };
  if (preset.userField === "assignee") conditions.assignee = "me";
  else {
    const field = roleCustomField(settings, preset.userField);
    if (!field) throw new Error(`В загруженных полях не найдено однозначное поле «${preset.userField === "qa" ? "QA" : "Code Reviewer"}»`);
    conditions.customFields[String(field.id)] = { mode: "me" };
  }
  return conditions;
}

export function presetUnavailableReason(preset: FilterPreset, statuses: readonly RedmineIssueStatus[], settings: AppSettings): string | undefined {
  if (preset.statusName !== null && !presetStatus(preset, statuses)) return `статус ${preset.statusName} недоступен`;
  if (preset.userField && preset.userField !== "assignee" && !roleCustomField(settings, preset.userField)) {
    return `поле ${preset.userField === "qa" ? "QA" : "Code Reviewer"} не найдено однозначно`;
  }
}
