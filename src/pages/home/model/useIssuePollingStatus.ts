import { useEffect, useState } from "react";
import { getNotificationStatus, type NotificationListenerStatus } from "src/features/issue-events";
import type { AppSettings } from "src/entities/settings";
import { todayIso } from "src/shared/lib/date";

export function useIssuePollingStatus(settings: AppSettings | undefined, selectedDate: string) {
  const configured = Boolean(settings?.redmineUrl && settings.apiKey);
  const key = JSON.stringify([selectedDate, settings?.redmineUrl, settings?.apiKey, settings?.eventsPollingEnabled, settings?.eventSources, settings?.customFields]);
  const [state, setState] = useState<{ key: string; status: NotificationListenerStatus } | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    const refresh = async () => {
      // Recheck the local date on every tick so the label disappears after midnight.
      if (!configured || selectedDate !== todayIso()) { if (active) setState(null); return; }
      try {
        const status = await getNotificationStatus();
        if (active) setState({ key, status });
      } catch (error) {
        if (active) setState({ key, status: { enabled: false, lastCheckedAt: null, error: error instanceof Error ? error.message : String(error) } });
      }
    };
    void refresh();
    const timer = configured ? window.setInterval(() => { void refresh(); }, 5_000) : undefined;
    return () => { active = false; window.clearInterval(timer); };
  }, [key, configured, selectedDate]);

  return state?.key === key ? state.status : null;
}
