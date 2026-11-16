export type StorageUsage = { usage: number; quota: number; indexedDB?: number; persistent: boolean };

export async function estimateStorage(): Promise<StorageUsage | null> {
  if (!navigator.storage?.estimate) return null;
  const [estimate, persistent] = await Promise.all([
    navigator.storage.estimate(), navigator.storage.persisted?.() ?? Promise.resolve(false),
  ]);
  if (estimate.usage === undefined || !estimate.quota) return null;
  const details = (estimate as StorageEstimate & { usageDetails?: { indexedDB?: number } }).usageDetails;
  return { usage: estimate.usage, quota: estimate.quota, indexedDB: details?.indexedDB, persistent };
}

export function requestPersistentStorage(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? Promise.resolve(false);
}

export function formatStorageBytes(bytes: number): string {
  const units = ["Б", "КиБ", "МиБ", "ГиБ", "ТиБ"];
  const index = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(bytes || 1) / Math.log(1024))));
  return `${(bytes / 1024 ** index).toLocaleString("ru-RU", { maximumFractionDigits: index ? 2 : 0 })} ${units[index]}`;
}
