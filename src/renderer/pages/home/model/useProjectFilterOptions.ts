import { useEffect, useState } from "react";
import type { AppSettings, RedmineNamedItem } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";

type Method = "getProjectVersions" | "getProjectUsers" | "getProjectCategories";
type OptionsState = {
  projectId: number;
  items: RedmineNamedItem[];
  loading: boolean;
  error: string | null;
};

export function useProjectFilterOptions(projectId: number | null, settings: AppSettings, method: Method) {
  const [state, setState] = useState<OptionsState | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (projectId === null) return;
    let active = true;
    setState({ projectId, items: [], loading: true, error: null });
    void api()[method](projectId).then(
      (items) => {
        if (active) setState({ projectId, items, loading: false, error: null });
      },
      (reason: unknown) => {
        if (active) setState({ projectId, items: [], loading: false, error: reason instanceof Error ? reason.message : String(reason) });
      },
    );
    return () => { active = false; };
  }, [projectId, method, revision, settings.redmineUrl, settings.apiKey, settings.userId, settings.certificatePath]);

  const current = projectId !== null && state?.projectId === projectId;
  return {
    items: current ? state.items : [],
    loading: projectId !== null && (!current || state.loading),
    error: current ? state.error : null,
    refresh: () => setRevision((value) => value + 1),
  };
}
