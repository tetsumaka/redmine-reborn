import type { IssueEvent } from "src/shared/types";

export type IssueJournal = {
  id: number;
  user: { id: number; name: string };
  notes?: string;
  created_on: string;
  details: Array<{
    property: string;
    name: string;
    old_value?: string | null;
    new_value?: string | null;
  }>;
};

export type IssueHistory = {
  id: number;
  subject: string;
  status: { id: number };
  author: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  created_on: string;
  updated_on: string;
  journals: IssueJournal[];
};

export type IssueNotification = IssueEvent;
