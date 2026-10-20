import type { IssueFilter } from "src/shared/types";

export const homeIssueFilters: Array<{
  value: IssueFilter;
  title: string;
  description: string;
}> = [
  {
    value: "assigned",
    title: "Назначенные на меня задачи",
    description: "Открытые задачи, назначенные на вас",
  },
  {
    value: "watched",
    title: "Отслеживаемые задачи",
    description: "Открытые задачи, в которых вы наблюдатель",
  },
  {
    value: "codeReview",
    title: "Ждут Code Review",
    description: "Вы — кодревьювер, статус — Code Review",
  },
  {
    value: "qaResolved",
    title: "Ждут проверки",
    description: "Вы — QA, статус — Resolved",
  },
  {
    value: "qaFeedback",
    title: "Ждут обратной связи",
    description: "Вы — QA, статус — Feedback",
  },
];
