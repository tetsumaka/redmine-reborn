export type Entry = {
  id: string; date: string; issueId: string; start: string; end: string;
  tracker: string; subject: string; activity: string; comment: string;
  location: string; synced: boolean; redmineTimeEntryId?: number;
};
export type Settings = {
  redmineUrl: string; apiKey: string; userId: string; certificatePath: string;
  activityIds: Record<string, number>;
};
export type AppData = { entries: Entry[]; settings: Settings };
export type SyncResult = { synced: number; downloaded: number; errors: Array<{ id: string; message: string }> };

declare global {
  interface Window {
    timeTracker: {
      load(): Promise<AppData>;
      save(data: AppData): Promise<void>;
      chooseCertificate(): Promise<string>;
      sync(year: number, month: number): Promise<SyncResult>;
    };
  }
}
