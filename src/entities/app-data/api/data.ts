import { appDataStorage } from "./storage";
import type { AppData } from "../model/types";
import type { AppSettings } from "src/entities/settings/@x/app-data";
import { validateSettings } from "../lib/normalize";
import { enqueueDataOperation, waitForDataOperations, withEditingLocked } from "src/shared/lib/data-operations";

const subscribers = new Set<(data: AppData) => void | Promise<void>>();
const beforeReplacement = new Set<() => void>();
async function changed(data: AppData): Promise<void> {
  for (const listener of subscribers) await listener(data);
}

export function onAppDataChanged(listener: (data: AppData) => void | Promise<void>): () => void {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}
export function onBeforeDataReplacement(listener: () => void): () => void {
  beforeReplacement.add(listener);
  return () => { beforeReplacement.delete(listener); };
}
export async function loadAppData(): Promise<AppData> {
  await waitForDataOperations();
  return appDataStorage.read();
}
export function saveAppData(value: AppData): Promise<void> {
  const data = structuredClone(value);
  return enqueueDataOperation(async () => {
    validateSettings(data.settings);
    await appDataStorage.write(data);
    await changed(data);
  });
}
export function saveAppSettings(value: Partial<AppSettings>): Promise<AppData> {
  const patch = structuredClone(value);
  return enqueueDataOperation(async () => {
    // Read after pending edits so a connection check cannot overwrite newer time entries or settings.
    const data = await appDataStorage.read();
    data.settings = { ...data.settings, ...patch };
    validateSettings(data.settings);
    await appDataStorage.write(data);
    await changed(data);
    return data;
  });
}
export function exportBackup() {
  return enqueueDataOperation(() => appDataStorage.exportBackup());
}
export function importBackup(value: unknown): Promise<AppData> {
  return enqueueDataOperation(() => withEditingLocked(async () => {
    for (const listener of beforeReplacement) listener();
    try { return await appDataStorage.importBackup(value); }
    finally { await changed(await appDataStorage.read()); }
  }));
}
