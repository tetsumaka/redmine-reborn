import { roleCustomField, type AppSettings } from "src/entities/settings/@x/issue-filter";
import type { CustomIssueFilter, CustomIssueFilterConditions, CustomFieldCondition } from "src/entities/issue-filter/model/types";
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
  const roleColumns = [roleCustomField(settings, "codeReviewer"), roleCustomField(settings, "qa")]
    .flatMap((field) => field ? [`cf_${field.id}`] : []);
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

export function normalizeCustomFilters(filters: CustomIssueFilter[] | undefined, settings: AppSettings): CustomIssueFilter[] {
  return (Array.isArray(filters) ? filters : []).map((filter) => ({
    ...filter,
    description: filter.description ?? "",
    width: ["1", "1/2", "1/3"].includes(filter.width) ? filter.width : "1",
    pageSize: Number.isInteger(filter.pageSize) && filter.pageSize >= 1 && filter.pageSize <= 100 ? filter.pageSize : 10,
    projectId: filter.projectId ?? null,
    projectIdentifier: filter.projectIdentifier ?? "",
    conditions: restoreFilterConditions(filter.conditions, settings),
  }));
}

export function filterColumnOptions(settings: AppSettings, selected: readonly string[] | null = null) {
  const options = [...issueColumnOptions];
  for (const field of settings.customFields) {
    const value = `cf_${field.id}`;
    if (!options.some((option) => option.value === value)) {
      options.push({ value, label: field.name });
    }
  }
  for (const column of selected ?? []) {
    if (/^cf_[1-9]\d*$/.test(column) && !options.some((option) => option.value === column)) {
      options.push({ value: column, label: `Пользовательское поле #${column.slice(3)}` });
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
    customFields: {},
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
  qaId?: string;
  codeReviewerId?: string;
}, settings?: AppSettings): CustomIssueFilterConditions {
  const { authorMe, qaMe, reviewerMe, qaId, codeReviewerId, customFields: rawFields, ...current } = value ?? {};
  const customFields = normalizeFieldConditions(rawFields ?? {});
  for (const [role, legacyValue] of [["qa", qaId ?? (qaMe ? "me" : "")], ["codeReviewer", codeReviewerId ?? (reviewerMe ? "me" : "")]] as const) {
    if (!legacyValue) continue;
    const field = settings && roleCustomField(settings, role);
    if (!field) throw new Error(`Не найдено пользовательское поле ${role === "qa" ? "QA" : "Code Reviewer"} для сохранённого фильтра`);
    if (!customFields[field.id]) customFields[field.id] = legacyValue === "me" ? { mode: "me" }
      : legacyValue === "none" || legacyValue === "unassigned" ? { mode: "none" }
      : legacyValue === "any" ? { mode: "present" } : { mode: "value", value: legacyValue };
  }
  return {
    ...emptyFilterConditions(),
    ...current,
    columns: Array.isArray(current.columns) ? [...new Set(current.columns)].filter((column) => column !== "id") : null,
    authorId: current.authorId ?? (authorMe ? "me" : ""),
    customFields,
  };
}

function normalizeFieldConditions(value: unknown): Record<string, CustomFieldCondition> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Некорректные условия пользовательских полей");
  return Object.fromEntries(Object.entries(value).map(([id, condition]) => {
    if (!/^[1-9]\d*$/.test(id) || !condition || typeof condition !== "object" || !("mode" in condition)) throw new Error("Некорректное условие пользовательского поля");
    const mode = condition.mode;
    if (mode === "value" && "value" in condition && typeof condition.value === "string") return [id, { mode, value: condition.value }];
    if (mode === "any" || mode === "me" || mode === "none" || mode === "present") return [id, { mode }];
    throw new Error("Некорректное условие пользовательского поля");
  }));
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
  for (const [id, condition] of Object.entries(normalizeFieldConditions(conditions.customFields))) {
    const field = `cf_${id}`;
    if (condition.mode === "me") add(field, "=", positiveId(String(currentUserId), "ID текущего пользователя"));
    else if (condition.mode === "none") add(field, "!*");
    else if (condition.mode === "present") add(field, "*");
    else if (condition.mode === "value") {
      if (!condition.value) throw new Error(`Введите значение для пользовательского поля #${id}`);
      add(field, "=", condition.value);
    }
  }
  if (conditions.parentIssueId.trim()) add("parent_id", "=", positiveId(conditions.parentIssueId.trim(), "номер родительской задачи"));
  if (conditions.subject.trim()) add("subject", "~", conditions.subject.trim());
  return url.toString();
}
