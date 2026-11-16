import * as redmineQueries from "src/entities/redmine";
import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "src/entities/settings";
import type { RedmineNamedItem } from "src/entities/redmine";

type Method = "getProjectVersions" | "getProjectCategories";
type OptionsState = {
  key: string;
  items: RedmineNamedItem[];
  loading: boolean;
  error: string | null;
};

export function useProjectFilterOptions(projectId: number | null, settings: AppSettings, method: Method, enabled = true) {
  const [state, setState] = useState<OptionsState | null>(null);
  const [revision, setRevision] = useState(0);
  // Each hook belongs to one dialog. Cache both pending and successful requests
  // so revisiting a project cannot refetch the same dictionary implicitly.
  const requests = useRef(new Map<string, Promise<RedmineNamedItem[]>>());
  const key = JSON.stringify([method, projectId, settings.redmineUrl, settings.apiKey]);
  const canLoad = enabled && projectId !== null;

  useEffect(() => {
    if (!enabled || projectId === null) return;
    let active = true;
    setState({ key, items: [], loading: true, error: null });
    let request = requests.current.get(key);
    if (!request) {
      request = redmineQueries[method](projectId);
      requests.current.set(key, request);
    }
    void request.then(
      (items) => {
        if (active) setState({ key, items, loading: false, error: null });
      },
      (reason: unknown) => {
        if (active) setState({ key, items: [], loading: false, error: reason instanceof Error ? reason.message : String(reason) });
      },
    );
    return () => { active = false; };
  }, [key, revision, enabled]);

  const current = canLoad && state?.key === key ? state : null;
  return {
    items: current?.items ?? [],
    loading: canLoad && (!current || current.loading),
    error: current?.error ?? null,
    refresh: () => {
      requests.current.delete(key);
      setRevision((value) => value + 1);
    },
  };
}
