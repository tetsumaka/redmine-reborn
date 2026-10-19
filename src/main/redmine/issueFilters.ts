import type {
  AppSettings,
  IssueFilter,
  RedmineIssueStatus,
} from "src/shared/types";

function positiveId(value: string, label: string): string {
  const id = value?.trim();
  if (!/^[1-9]\d*$/.test(id ?? "")) {
    throw new Error(`Укажите ${label} в настройках Redmine → Фильтры главной страницы`);
  }
  return id;
}

function normalizeStatus(name: string): string {
  return name.toLowerCase().replace(/[\s_-]/g, "");
}

export function configuredStatus(filter: IssueFilter, settings: AppSettings): string {
  switch (filter) {
    case "codeReview":
      return settings.issueFilters.codeReviewStatusId;
    case "qaResolved":
      return settings.issueFilters.resolvedStatusId;
    case "qaFeedback":
      return settings.issueFilters.feedbackStatusId;
    default:
      return "open";
  }
}

export function issueQuery(
  filter: IssueFilter,
  settings: AppSettings,
  statuses: RedmineIssueStatus[] = [],
): URLSearchParams {
  const params = new URLSearchParams({ status_id: "open", sort: "updated_on:desc,id:desc" });
  const filters = settings.issueFilters;
  let fieldId: string;
  let statusName: string;
  switch (filter) {
    case "assigned":
      params.set("assigned_to_id", settings.userId);
      return params;
    case "watched":
      params.set("watcher_id", settings.userId);
      return params;
    case "codeReview":
      fieldId = positiveId(filters.codeReviewerFieldId, "ID поля «Кодревьювер»");
      statusName = "codereview";
      break;
    case "qaResolved":
      fieldId = positiveId(filters.qaFieldId, "ID поля «QA»");
      statusName = "resolved";
      break;
    case "qaFeedback":
      fieldId = positiveId(filters.qaFieldId, "ID поля «QA»");
      statusName = "feedback";
      break;
    default:
      throw new Error("Неизвестный фильтр задач");
  }
  const statusId = configuredStatus(filter, settings)
    || String(statuses.find((status) => normalizeStatus(status.name) === statusName)?.id ?? "");
  if (!statusId) {
    throw new Error(`Статус «${statusName}» не найден. Выберите его в настройках фильтров главной страницы`);
  }
  params.set(`cf_${fieldId}`, settings.userId);
  params.set("status_id", positiveId(statusId, `статус «${statusName}»`));
  return params;
}
