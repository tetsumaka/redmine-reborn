import { claimSession, database } from "src/shared/lib/indexed-db";
import { loadAppData, onAppDataChanged, onBeforeDataReplacement } from "src/entities/app-data";
import { configureIssueEvents, stopIssueEvents } from "src/features/issue-events";
import { desktopApi } from "src/shared/api/desktop";

export async function initializeApp(): Promise<() => void> {
  desktopApi();
  const release = await claimSession();
  const unsubscribe = onAppDataChanged((data) => configureIssueEvents(data.settings));
  const unsubscribeBefore = onBeforeDataReplacement(stopIssueEvents);
  const dispose = () => {
    stopIssueEvents(); unsubscribe(); unsubscribeBefore();
    void database.then((db) => db.close(), () => {}); release();
  };
  try { configureIssueEvents((await loadAppData()).settings); }
  catch (error) { dispose(); throw error; }
  return dispose;
}
