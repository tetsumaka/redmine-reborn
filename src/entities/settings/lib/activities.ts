import type { TimeEntryActivity } from "../model/types";

export function normalizeActivities(value: unknown): TimeEntryActivity[] {
  if (!Array.isArray(value)) throw new Error("Redmine не вернул справочник деятельностей");
  const ids = new Set<number>();
  return value.map((item): TimeEntryActivity => {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== "string" || !item.name.trim() ||
        (item.active !== undefined && typeof item.active !== "boolean") || (item.isDefault !== undefined && typeof item.isDefault !== "boolean") || ids.has(item.id)) {
      throw new Error("Некорректный справочник деятельностей Redmine");
    }
    ids.add(item.id);
    return { id: item.id, name: item.name.trim(), active: item.active ?? true, isDefault: item.isDefault ?? false };
  });
}

const activityKey = (name: string) => name.trim().toLowerCase().replace(/[\s_-]+/g, "").replace(/^cr$/, "codereview");

/** Resolve older records by name, but do not guess between activities with the same name. */
export function findActivity(activities: readonly TimeEntryActivity[], name: string, id?: number): TimeEntryActivity | undefined {
  const matches = activities.filter((item) => item.active && activityKey(item.name) === activityKey(name));
  return matches.find((item) => item.id === id) ?? (matches.length === 1 ? matches[0] : undefined);
}
