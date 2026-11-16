export type IssueEvent = {
  key: string;
  issueId: number;
  journalId: number;
  createdAt: number;
  title: string;
  message: string;
  comment?: string;
};

export type IssueEventsResult = {
  events: IssueEvent[];
  errors: string[];
};

export type StoredIssueEvent = IssueEvent & { account: string };

export type PollCursor = { account: string; checkedAt: number };
