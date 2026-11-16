import { getIssueEvents, refreshIssueEvents, onIssueEventsChanged } from "src/features/issue-events";
import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "src/entities/settings";
import type { IssueEventsResult } from "src/entities/issue-event";
import { localDayRange } from "src/shared/lib/date";

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
  const configured = Boolean(settings?.redmineUrl && settings.apiKey);
  const canRead = Boolean(settings?.redmineUrl);
  const key = JSON.stringify([selectedDate, settings?.redmineUrl, settings?.apiKey]);
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
        const result = await getIssueEvents(from, to);
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
      void refreshIssueEvents(from, to).then(
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
    const unsubscribe = canRead ? onIssueEventsChanged(() => { void read(); }) : undefined;
    return () => { active = false; unsubscribe?.(); };
  }, [key, canRead, configured]);

  return {
    ...(state.key === key ? state : emptyState(key, canRead)),
    configured,
    refresh: () => refreshRef.current(),
  };
}
