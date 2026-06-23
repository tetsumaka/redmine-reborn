export type Entry = {
  id: string; date: string; issueId: string; start?: string; end?: string; minutes?: number;
  tracker: string; subject: string; activity: string; comment: string;
  synced: boolean; redmineTimeEntryId?: number; createdAt?: string;
};
export type Settings = {
  redmineUrl: string; apiKey: string; userId: string; certificatePath: string;
  activityIds: Record<string, number>;
};
export type AppData = { entries: Entry[]; settings: Settings };
export type SyncResult = { synced: number; downloaded: number; deleted: number; errors: Array<{ id: string; message: string }> };

declare global {
  interface Window {
    timeTracker: {
      load(): Promise<AppData>;
      save(data: AppData): Promise<void>;
      chooseCertificate(): Promise<string>;
      sync(date: string): Promise<SyncResult>;
    };
  }
}
