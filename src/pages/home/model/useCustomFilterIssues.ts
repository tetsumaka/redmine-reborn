import { getCustomFilterIssues } from "src/entities/redmine";
import { useEffect, useState } from "react";
import type { AppSettings } from "src/entities/settings";
import type { CustomIssueFilter } from "src/entities/issue-filter";
import type { IssuePage } from "src/entities/redmine";

type Result = { key: string; data: IssuePage | null; error: string | null };

export function useCustomFilterIssues(filter: CustomIssueFilter, settings: AppSettings, revision: number, configured: boolean) {
  const query = JSON.stringify([filter.id, filter.projectIdentifier, filter.conditions, filter.pageSize]);
  const [pagination, setPagination] = useState({ query, page: 0 });
  const page = pagination.query === query ? pagination.page : 0;
  const key = JSON.stringify([query, page, settings, revision]);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    void getCustomFilterIssues(filter.id, page * filter.pageSize, filter.pageSize).then(
      (data) => {
        if (!active) return;
        if (page > 0 && data.offset >= data.totalCount) {
          setPagination({ query, page: Math.max(0, Math.ceil(data.totalCount / filter.pageSize) - 1) });
          return;
        }
        setResult({ key, data, error: null });
      },
      (error: unknown) => {
        if (active) setResult({ key, data: null, error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => { active = false; };
  }, [key, configured]);

  const current = configured && result?.key === key ? result : null;
  return {
    issues: current?.data?.issues ?? [],
    totalCount: current?.data?.totalCount ?? 0,
    loading: configured && !current,
    error: current?.error ?? null,
    page,
    setPage: (next: number) => setPagination({ query, page: Math.max(0, next) }),
  };
}
