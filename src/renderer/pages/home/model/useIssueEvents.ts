import { useEffect, useRef, useState } from "react";
import type { AppSettings, IssueEventsResult } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";
import { localDayRange } from "src/renderer/shared/lib/date";

type EventsState = IssueEventsResult & {
  key: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

function emptyState(key: string, loading: boolean): EventsState {
  return { key, events: [], errors: [], loading, refreshing: false, error: null };
}

export function useIssueEvents(settings: AppSettings | undefined, selectedDate: string) {
  const configured = Boolean(settings?.redmineUrl && settings.apiKey && settings.userId && settings.certificatePath);
  const canRead = Boolean(settings?.redmineUrl && settings.userId);
  const key = JSON.stringify([selectedDate, settings?.redmineUrl, settings?.userId, settings?.apiKey, settings?.certificatePath]);
  const [state, setState] = useState(() => emptyState(key, canRead));
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let readRevision = 0;
    let refreshing = false;
    setState(emptyState(key, canRead));
    const { from, to } = localDayRange(selectedDate);
    const read = async () => {
      const revision = ++readRevision;
      try {
        const result = await api().getIssueEvents(from, to);
        if (active && revision === readRevision) setState((current) => ({
          ...current, key, events: result.events, loading: false, error: null,
        }));
      } catch (error) {
        if (active && revision === readRevision) setState((current) => ({
          ...current, loading: false, error: error instanceof Error ? error.message : String(error),
        }));
      }
    };
    refreshRef.current = () => {
      if (!active || !configured || refreshing) return;
      refreshing = true;
      setState((current) => ({ ...current, refreshing: true, errors: [], error: null }));
      void api().refreshIssueEvents(from, to).then(
        (result) => {
          if (!active) return;
          ++readRevision;
          setState({ ...result, key, loading: false, refreshing: false, error: null });
        },
        (error: unknown) => {
          if (active) setState((current) => ({ ...current, refreshing: false, error: error instanceof Error ? error.message : String(error) }));
        },
      ).finally(() => { refreshing = false; });
    };
    if (canRead) void read();
    // Polling only notifies us to read the local database, never to fetch Redmine.
    const unsubscribe = canRead ? api().onIssueEventsChanged(() => { void read(); }) : undefined;
    return () => { active = false; unsubscribe?.(); };
  }, [key, canRead, configured]);

  return {
    ...(state.key === key ? state : emptyState(key, canRead)),
    configured,
    refresh: () => refreshRef.current(),
  };
}
