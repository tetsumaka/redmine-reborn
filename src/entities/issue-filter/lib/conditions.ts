import type { AppSettings } from "src/entities/settings/@x/issue-filter";
import type { CustomIssueFilter, CustomIssueFilterConditions } from "src/entities/issue-filter/model/types";
import type { IssueDisplayColumn } from "src/entities/redmine/@x/issue-filter";
import { ISSUE_TABLE_COLUMN_OPTIONS } from "src/entities/redmine/@x/issue-filter";

export const issueGroupingOptions = [
  { value: "", label: "Не группировать" },
  { value: "project", label: "Проект" },
  { value: "tracker", label: "Трекер" },
  { value: "status", label: "Статус" },
  { value: "priority", label: "Приоритет" },
  { value: "author", label: "Автор" },
  { value: "assigned_to", label: "Назначена" },
  { value: "category", label: "Категория" },
  { value: "fixed_version", label: "Версия" },
  { value: "start_date", label: "Дата начала" },
  { value: "due_date", label: "Дата завершения" },
  { value: "done_ratio", label: "Готовность" },
  { value: "created_on", label: "Дата создания" },
  { value: "updated_on", label: "Дата обновления" },
  { value: "closed_on", label: "Дата закрытия" },
];

export const issueColumnOptions: Array<{ value: string; label: string }> = ISSUE_TABLE_COLUMN_OPTIONS.map(({ redmineColumn, label }) => ({ value: redmineColumn, label }));

export function defaultIssueColumns(settings: AppSettings): string[] {
  const roleColumns = [settings.issueFilters.codeReviewerFieldId, settings.issueFilters.qaFieldId]
    .map((id) => id.trim()).filter((id) => /^[1-9]\d*$/.test(id)).map((id) => `cf_${id}`);
  return [...new Set(["priority", "subject", "status", "assigned_to", ...roleColumns, "project"])];
}

const unsortableColumns = new Set(["parent.subject", "relations", "attachments"]);
export const issueSortOptions = [
  { value: "id", label: "Номер задачи" },
  ...issueColumnOptions.filter((option) => !unsortableColumns.has(option.value)),
];

export function customFilterColumns(conditions: CustomIssueFilterConditions, settings: AppSettings): IssueDisplayColumn[] {
  return (conditions.columns ?? defaultIssueColumns(settings)).flatMap((column) => {
    const option = ISSUE_TABLE_COLUMN_OPTIONS.find((item) => item.redmineColumn === column);
    return option ? [option.value as IssueDisplayColumn] : /^cf_[1-9]\d*$/.test(column) ? [column as IssueDisplayColumn] : [];
  });
}

export function normalizeCustomFilters(filters: CustomIssueFilter[] | undefined): CustomIssueFilter[] {
  return (Array.isArray(filters) ? filters : []).map((filter) => ({
    ...filter,
    description: filter.description ?? "",
    width: ["1", "1/2", "1/3"].includes(filter.width) ? filter.width : "1",
    pageSize: Number.isInteger(filter.pageSize) && filter.pageSize >= 1 && filter.pageSize <= 100 ? filter.pageSize : 10,
    projectId: filter.projectId ?? null,
    projectIdentifier: filter.projectIdentifier ?? "",
    conditions: restoreFilterConditions(filter.conditions),
  }));
}

export function filterColumnOptions(settings: AppSettings, selected: readonly string[] | null = null) {
  const options = [...issueColumnOptions];
  for (const [fieldId, label] of [
    [settings.issueFilters.codeReviewerFieldId.trim(), "Code Reviewer"],
    [settings.issueFilters.qaFieldId.trim(), "Quality Assurance"],
  ]) {
    const value = `cf_${fieldId}`;
    if (/^[1-9]\d*$/.test(fieldId) && !options.some((option) => option.value === value)) {
      options.push({ value, label });
    }
  }
  for (const column of selected ?? []) {
    if (/^cf_[1-9]\d*$/.test(column) && !options.some((option) => option.value === column)) {
      const label = column === `cf_${settings.issueFilters.qaFieldId.trim()}` ? "Quality Assurance"
        : column === `cf_${settings.issueFilters.codeReviewerFieldId.trim()}` ? "Code Reviewer"
        : `Пользовательское поле #${column.slice(3)}`;
      options.push({ value: column, label });
    }
  }
  return options;
}

export function emptyFilterConditions(): CustomIssueFilterConditions {
  return {
    statusId: "o",
    trackerId: "",
    priorityId: "",
    fixedVersionId: "",
    groupBy: "",
    columns: null,
    assignee: "",
    authorId: "",
    categoryId: "",
    categoryProjectId: "",
    qaId: "",
    codeReviewerId: "",
    parentIssueId: "",
    subject: "",
    watched: false,
    sortBy: "updated_on",
    sortDirection: "desc",
  };
}

export function restoreFilterConditions(value?: Partial<CustomIssueFilterConditions> & {
  authorMe?: boolean;
  qaMe?: boolean;
  reviewerMe?: boolean;
}): CustomIssueFilterConditions {
  const { authorMe, qaMe, reviewerMe, ...current } = value ?? {};
  return {
    ...emptyFilterConditions(),
    ...current,
    columns: Array.isArray(current.columns) ? [...new Set(current.columns)].filter((column) => column !== "id") : null,
    authorId: current.authorId ?? (authorMe ? "me" : ""),
    qaId: current.qaId ?? (qaMe ? "me" : ""),
    codeReviewerId: current.codeReviewerId ?? (reviewerMe ? "me" : ""),
  };
}

export function customFilterUrl(
  projectIdentifier: string,
  conditions: CustomIssueFilterConditions,
  settings: AppSettings,
  currentUserId: number | string,
): string {
  const base = new URL(`${settings.redmineUrl.replace(/\/+$/, "")}/`);
  if (base.protocol !== "https:" && base.protocol !== "http:") throw new Error("Укажите HTTP или HTTPS адрес Redmine");
  const url = new URL(projectIdentifier ? `projects/${encodeURIComponent(projectIdentifier)}/issues` : "issues", base);
  url.searchParams.set("set_filter", "1");
  const sortBy = conditions.sortBy ?? "updated_on";
  const sortDirection = conditions.sortDirection ?? "desc";
  if (!issueSortOptions.some((option) => option.value === sortBy) || !["asc", "desc"].includes(sortDirection)) {
    throw new Error("Выберите доступную колонку и направление сортировки");
  }
  url.searchParams.set("sort", `${sortBy}:${sortDirection}${sortBy === "id" ? "" : ",id:desc"}`);
  const groupBy = conditions.groupBy ?? "";
  if (!issueGroupingOptions.some((option) => option.value === groupBy)) throw new Error("Выберите доступную группировку");
  url.searchParams.set("group_by", groupBy);
  const columns = conditions.columns ?? defaultIssueColumns(settings);
  const available = new Set(["id", ...issueColumnOptions.map((option) => option.value)]);
  if (!Array.isArray(columns) || columns.some((column) => !available.has(column) && !/^cf_[1-9]\d*$/.test(column))) {
    throw new Error("Выберите доступные колонки результатов");
  }
  for (const column of new Set(["id", ...columns])) url.searchParams.append("c[]", column);
  const add = (field: string, operator: string, value?: string) => {
    url.searchParams.append("f[]", field);
    url.searchParams.set(`op[${field}]`, operator);
    if (value !== undefined) url.searchParams.append(`v[${field}][]`, value);
  };
  const positiveId = (id: string, label: string) => {
    if (!/^[1-9]\d*$/.test(id)) throw new Error(`Проверьте ${label}`);
    return id;
  };
  const addUser = (field: string, value: string, label: string) => {
    if (value === "none" || value === "unassigned") add(field, "!*");
    else if (value === "any") add(field, "*");
    else if (value) add(field, "=", positiveId(value === "me" ? String(currentUserId) : value, label));
  };
  if (["o", "c", "*"].includes(conditions.statusId)) add("status_id", conditions.statusId);
  else add("status_id", "=", positiveId(conditions.statusId, "статус задачи"));
  if (conditions.trackerId) add("tracker_id", "=", positiveId(conditions.trackerId, "трекер"));
  if (conditions.priorityId) add("priority_id", "=", positiveId(conditions.priorityId, "приоритет"));
  if (conditions.fixedVersionId === "none") add("fixed_version_id", "!*");
  else if (conditions.fixedVersionId === "any") add("fixed_version_id", "*");
  else if (conditions.fixedVersionId) add("fixed_version_id", "=", positiveId(conditions.fixedVersionId, "версию"));
  addUser("assigned_to_id", conditions.assignee, "исполнителя");
  addUser("author_id", conditions.authorId, "автора");
  if (!projectIdentifier && conditions.categoryId) {
    if (["none", "any"].includes(conditions.categoryId)) {
      throw new Error("Для условий «Без категории» и «Категория указана» выберите проект: Redmine поддерживает фильтр по категории только внутри проекта");
    }
    url.searchParams.set("project_id", positiveId(conditions.categoryProjectId, "проект выбранной категории"));
  }
  if (conditions.categoryId === "none") add("category_id", "!*");
  else if (conditions.categoryId === "any") add("category_id", "*");
  else if (conditions.categoryId) add("category_id", "=", positiveId(conditions.categoryId, "категорию"));
  if (conditions.watched) add("watcher_id", "=", positiveId(String(currentUserId), "ID текущего пользователя"));
  if (conditions.codeReviewerId) addUser(`cf_${positiveId(settings.issueFilters.codeReviewerFieldId, "ID поля «Code Reviewer» в настройках Redmine")}`, conditions.codeReviewerId, "кодревьювера");
  if (conditions.qaId) addUser(`cf_${positiveId(settings.issueFilters.qaFieldId, "ID поля «Quality Assurance» в настройках Redmine")}`, conditions.qaId, "QA");
  if (conditions.parentIssueId.trim()) add("parent_id", "=", positiveId(conditions.parentIssueId.trim(), "номер родительской задачи"));
  if (conditions.subject.trim()) add("subject", "~", conditions.subject.trim());
  return url.toString();
}
