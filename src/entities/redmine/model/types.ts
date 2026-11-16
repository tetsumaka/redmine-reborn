import type { TrackerType } from "src/entities/time-entry/@x/redmine";

export type RedmineNamedItem = { id: number; name: string; projectId?: number };

export type RedmineProject = {
  id: number;
  name: string;
  identifier: string;
  trackers: RedmineNamedItem[];
};

export type IssueSummary = {
  id: number;
  tracker: TrackerType;
  subject: string;
  estimatedHours?: number;
};

export type RedmineIssue = {
  id: number;
  subject: string;
  project: string;
  tracker: string;
  status: string;
  priority: string;
  assignedTo: string;
  fixedVersion: string;
  parentId: number | null;
  parentSubject: string;
  author: string;
  category: string;
  startDate: string;
  dueDate: string;
  createdOn: string;
  updatedOn: string;
  closedOn: string;
  spentHours: number | null;
  estimatedHours: number | null;
  totalEstimatedHours: number | null;
  totalSpentHours: number | null;
  doneRatio: number | null;
  lastUpdatedBy: string;
  relations: number[];
  attachments: Array<{ id: number; filename: string; contentUrl: string }>;
  customFields: Record<string, { name: string; value: string }>;
};

export type IssueTableColumn = Exclude<keyof RedmineIssue, "id" | "customFields">;

export type IssueDisplayColumn = IssueTableColumn | `cf_${number}`;

export type IssuePage = {
  issues: RedmineIssue[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type RedmineIssueStatus = {
  id: number;
  name: string;
  is_closed: boolean;
};
