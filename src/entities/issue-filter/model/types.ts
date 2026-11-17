export type CustomIssueFilterConditions = {
  statusId: string;
  trackerId: string;
  priorityId: string;
  fixedVersionId: string;
  groupBy: string;
  columns: string[] | null;
  assignee: string;
  authorId: string;
  categoryId: string;
  categoryProjectId: string;
  customFields: Record<string, CustomFieldCondition>;
  parentIssueId: string;
  subject: string;
  watched: boolean;
  sortBy: string;
  sortDirection: "asc" | "desc";
};

export type CustomFieldCondition = { mode: "any" | "me" | "none" | "present" } | { mode: "value"; value: string };

export type CustomIssueFilter = {
  id: string;
  name: string;
  description: string;
  width: "1" | "1/2" | "1/3";
  pageSize: number;
  projectId: number | null;
  projectName: string;
  projectIdentifier: string;
  url: string;
  conditions: CustomIssueFilterConditions;
};
