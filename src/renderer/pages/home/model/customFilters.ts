import type { AppSettings, CustomIssueFilterConditions } from "src/shared/types";

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

export const issueColumnOptions = [
  { value: "priority", label: "Приоритет" },
  { value: "subject", label: "Название" },
  { value: "project", label: "Проект" },
  { value: "tracker", label: "Трекер" },
  { value: "status", label: "Статус" },
  { value: "assigned_to", label: "Назначена" },
  { value: "author", label: "Автор" },
  { value: "category", label: "Категория" },
  { value: "fixed_version", label: "Версия" },
  { value: "parent", label: "Родительская задача" },
  { value: "start_date", label: "Дата начала" },
  { value: "due_date", label: "Дата завершения" },
  { value: "done_ratio", label: "Готовность" },
  { value: "estimated_hours", label: "Оценка времени" },
  { value: "spent_hours", label: "Затраченное время" },
  { value: "total_estimated_hours", label: "Общая оценка времени" },
  { value: "total_spent_hours", label: "Общее затраченное время" },
  { value: "created_on", label: "Дата создания" },
  { value: "updated_on", label: "Дата обновления" },
  { value: "closed_on", label: "Дата закрытия" },
  { value: "last_updated_by", label: "Последний изменивший" },
  { value: "relations", label: "Связанные задачи" },
  { value: "attachments", label: "Файлы" },
];

export const defaultIssueColumns = ["priority", "subject", "status", "assigned_to", "tracker", "updated_on"];

export function filterColumnOptions(settings: AppSettings) {
  const options = [...issueColumnOptions];
  for (const { id, label } of [
    { id: settings.issueFilters.qaFieldId.trim(), label: "Quality Assurance" },
    { id: settings.issueFilters.codeReviewerFieldId.trim(), label: "Code Reviewer" },
  ]) {
    if (/^[1-9]\d*$/.test(id) && !options.some((option) => option.value === `cf_${id}`)) {
      options.push({ value: `cf_${id}`, label });
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
    qaId: "",
    codeReviewerId: "",
    parentIssueId: "",
    subject: "",
    watched: false,
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
): string {
  if (!projectIdentifier) throw new Error("Выберите проект");
  const base = new URL(`${settings.redmineUrl.replace(/\/+$/, "")}/`);
  if (base.protocol !== "https:" && base.protocol !== "http:") throw new Error("Укажите HTTP или HTTPS адрес Redmine");
  const url = new URL(`projects/${encodeURIComponent(projectIdentifier)}/issues`, base);
  url.searchParams.set("set_filter", "1");
  const groupBy = conditions.groupBy ?? "";
  if (!issueGroupingOptions.some((option) => option.value === groupBy)) throw new Error("Выберите доступную группировку");
  url.searchParams.set("group_by", groupBy);
  if (conditions.columns != null) {
    const available = new Set(["id", ...issueColumnOptions.map((option) => option.value)]);
    if (!Array.isArray(conditions.columns) || conditions.columns.some((column) => !available.has(column) && !/^cf_[1-9]\d*$/.test(column))) {
      throw new Error("Выберите доступные колонки результатов");
    }
    for (const column of new Set(["id", ...conditions.columns])) url.searchParams.append("c[]", column);
  }
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
    else if (value) add(field, "=", value === "me" ? "me" : positiveId(value, label));
  };
  if (["o", "c", "*"].includes(conditions.statusId)) add("status_id", conditions.statusId);
  else add("status_id", "=", positiveId(conditions.statusId, "статус задачи"));
  if (conditions.trackerId) add("tracker_id", "=", positiveId(conditions.trackerId, "трекер"));
  if (conditions.priorityId) add("priority_id", "=", positiveId(conditions.priorityId, "приоритет"));
  if (conditions.fixedVersionId === "none") add("fixed_version_id", "!*");
  else if (conditions.fixedVersionId === "any") add("fixed_version_id", "*");
  else if (conditions.fixedVersionId) add("fixed_version_id", "=", positiveId(conditions.fixedVersionId, "целевую версию"));
  addUser("assigned_to_id", conditions.assignee, "исполнителя");
  addUser("author_id", conditions.authorId, "автора");
  if (conditions.categoryId === "none") add("category_id", "!*");
  else if (conditions.categoryId === "any") add("category_id", "*");
  else if (conditions.categoryId) add("category_id", "=", positiveId(conditions.categoryId, "категорию"));
  if (conditions.watched) add("watcher_id", "=", "me");
  if (conditions.codeReviewerId) addUser(`cf_${positiveId(settings.issueFilters.codeReviewerFieldId, "ID поля «Code Reviewer» в настройках Redmine")}`, conditions.codeReviewerId, "кодревьювера");
  if (conditions.qaId) addUser(`cf_${positiveId(settings.issueFilters.qaFieldId, "ID поля «Quality Assurance» в настройках Redmine")}`, conditions.qaId, "QA");
  if (conditions.parentIssueId.trim()) add("parent_id", "=", positiveId(conditions.parentIssueId.trim(), "номер родительской задачи"));
  if (conditions.subject.trim()) add("subject", "~", conditions.subject.trim());
  return url.toString();
}
