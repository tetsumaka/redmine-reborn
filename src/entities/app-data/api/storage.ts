import { database } from "src/shared/lib/indexed-db";
import type { AppBackup, AppData } from "src/entities/app-data/model/types";
import { emptyData, normalizeAppData } from "src/entities/app-data/lib/normalize";

class AppDataStorage {
  private readonly db = database;

  async read(): Promise<AppData> {
    const raw = await (await this.db).get("data", "app");
    return raw ? normalizeAppData(raw) : emptyData();
  }

  async write(data: AppData): Promise<void> {
    const db = await this.db;
    const tx = db.transaction("data", "readwrite");
    await tx.store.put(data, "app");
    await tx.done;
  }

  async exportBackup(): Promise<AppBackup> {
    const tx = (await this.db).transaction(["data", "events", "cursors"]);
    const [data, events, cursors] = await Promise.all([
      tx.objectStore("data").get("app"), tx.objectStore("events").getAll(), tx.objectStore("cursors").getAll(),
    ]);
    await tx.done;
    return { format: "redmine-reborn", version: 1, exportedAt: new Date().toISOString(), data: data ? normalizeAppData(data) : emptyData(), events, cursors };
  }

  async importBackup(value: unknown): Promise<AppData> {
    if (!value || typeof value !== "object") throw new Error("Некорректный файл резервной копии");
    const raw = value as Partial<AppBackup>;
    const isBackup = "format" in raw;
    if (isBackup && (raw.format !== "redmine-reborn" || raw.version !== 1 || !Array.isArray(raw.events) || !Array.isArray(raw.cursors))) {
      throw new Error("Неизвестный формат резервной копии");
    }
    const data = normalizeAppData(isBackup ? raw.data : value);
    const events = isBackup ? raw.events! : [];
    const cursors = isBackup ? raw.cursors! : [];
    for (const event of events) {
      if (!event || typeof event.account !== "string" || !Number.isSafeInteger(event.issueId) || !Number.isSafeInteger(event.journalId) ||
          !Number.isSafeInteger(event.createdAt) || typeof event.title !== "string" || typeof event.message !== "string" ||
          (event.comment !== undefined && typeof event.comment !== "string")) throw new Error("Некорректная история событий в копии");
    }
    for (const cursor of cursors) {
      if (!cursor || typeof cursor.account !== "string" || !Number.isSafeInteger(cursor.checkedAt)) throw new Error("Некорректная позиция опроса в копии");
    }
    // Replace data and event history atomically; a failed import leaves the old database intact.
    const tx = (await this.db).transaction(["data", "events", "cursors"], "readwrite");
    await Promise.all([tx.objectStore("events").clear(), tx.objectStore("cursors").clear()]);
    await tx.objectStore("data").put(data, "app");
    for (const event of events) await tx.objectStore("events").put({ ...event, key: `${event.issueId}:${event.journalId}` });
    for (const cursor of cursors) await tx.objectStore("cursors").put(cursor);
    await tx.done;
    return data;
  }

}

export const appDataStorage = new AppDataStorage();
