import { useEffect, useState } from "react";
import type { AppSettings, IssueFilter, RedmineIssue } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";
import { homeIssueFilters } from "./filters";

type IssueListState = {
  issues: RedmineIssue[];
  loading: boolean;
  error: string | null;
};
type HomeIssuesState = Record<IssueFilter, IssueListState>;

function initialState(loading: boolean): HomeIssuesState {
  const empty = (): IssueListState => ({ issues: [], loading, error: null });
  return {
    assigned: empty(),
    watched: empty(),
    codeReview: empty(),
    qaResolved: empty(),
    qaFeedback: empty(),
  };
}

export function useHomeIssues(settings: AppSettings | undefined) {
  const configured = Boolean(
    settings?.redmineUrl && settings.apiKey && settings.userId && settings.certificatePath,
  );
  const [lists, setLists] = useState(() => initialState(configured));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLists(initialState(configured));
    if (configured) {
      for (const { value } of homeIssueFilters) {
        void api().getIssues(value).then(
          (issues) => {
            if (active) {
              setLists((current) => ({
                ...current,
                [value]: { issues, loading: false, error: null },
              }));
            }
          },
          (error: unknown) => {
            if (active) {
              setLists((current) => ({
                ...current,
                [value]: {
                  issues: [],
                  loading: false,
                  error: error instanceof Error ? error.message : String(error),
                },
              }));
            }
          },
        );
      }
    }
    return () => {
      active = false;
    };
  }, [settings, configured, revision]);

  return {
    lists,
    configured,
    loading: Object.values(lists).some((list) => list.loading),
    refresh: () => setRevision((current) => current + 1),
  };
}
