import type { IssueFilter } from "src/shared/types";

export const homeIssueFilters: Array<{ value: IssueFilter; title: string; description: string }> = [
  { value: "assigned", title: "Назначенные на меня задачи", description: "Открытые задачи, назначенные на вас" },
  { value: "watched", title: "Отслеживаемые задачи", description: "Открытые задачи, в которых вы наблюдатель" },
  { value: "codeReview", title: "Ждут codereview", description: "Вы — кодревьювер, статус — codereview" },
  { value: "qaResolved", title: "Ждут проверки", description: "Вы — QA, статус — resolved" },
  { value: "qaFeedback", title: "Ждут feedback", description: "Вы — QA, статус — feedback" },
];
