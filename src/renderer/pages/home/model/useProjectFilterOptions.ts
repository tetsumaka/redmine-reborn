import { useEffect, useRef, useState } from "react";
import type { AppSettings, RedmineNamedItem } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";

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
  const key = JSON.stringify([method, projectId, settings.redmineUrl, settings.apiKey, settings.userId, settings.certificatePath]);
  const canLoad = enabled && projectId !== null;

  useEffect(() => {
    if (!enabled || projectId === null) return;
    let active = true;
    setState({ key, items: [], loading: true, error: null });
    let request = requests.current.get(key);
    if (!request) {
      request = api()[method](projectId);
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
