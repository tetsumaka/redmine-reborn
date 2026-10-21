import { useEffect, useState } from "react";
import type { AppSettings, IssueEventsResult } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";
import { localDayRange } from "src/renderer/shared/lib/date";

type EventsState = IssueEventsResult & {
  date: string;
  loading: boolean;
  error: string | null;
};

function emptyState(date: string, loading: boolean): EventsState {
  return { date, events: [], errors: [], loading, error: null };
}

export function useIssueEvents(settings: AppSettings | undefined, selectedDate: string) {
  const configured = Boolean(
    settings?.redmineUrl && settings.apiKey && settings.userId && settings.certificatePath,
  );
  const [state, setState] = useState(() => emptyState(selectedDate, configured));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setState(emptyState(selectedDate, configured));
    if (configured) {
      const load = async () => {
        try {
          const { from, to } = localDayRange(selectedDate);
          const result = await api().getIssueEvents(from, to);
          if (active) setState({ ...result, date: selectedDate, loading: false, error: null });
        } catch (error) {
          if (active) setState({
            ...emptyState(selectedDate, false),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };
      void load();
    }
    return () => { active = false; };
  }, [selectedDate, revision, configured, settings?.redmineUrl, settings?.apiKey, settings?.userId, settings?.certificatePath]);

  return {
    ...(configured && state.date === selectedDate ? state : emptyState(selectedDate, configured)),
    configured,
    refresh: () => setRevision((current) => current + 1),
  };
}
