import { openDB } from "idb";

export const database = new Promise<Awaited<ReturnType<typeof openDB>>>((resolve, reject) => {
  let blocked = false;
  void openDB("redmine-reborn", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("data")) db.createObjectStore("data");
      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events", { keyPath: ["account", "issueId", "journalId"] })
          .createIndex("byAccountDate", ["account", "createdAt"]);
      }
      if (!db.objectStoreNames.contains("cursors")) db.createObjectStore("cursors", { keyPath: "account" });
      if (!db.objectStoreNames.contains("identities")) db.createObjectStore("identities");
    },
    blocked() { blocked = true; reject(new Error("Закройте другие вкладки приложения для обновления базы данных")); },
    blocking(_current, _next, event) { (event.target as IDBDatabase).close(); },
  }).then((db) => { if (blocked) db.close(); else resolve(db); }, reject);
});

export async function claimSession(): Promise<() => void> {
  if (!navigator.locks) throw new Error("Обновите браузер и откройте приложение через HTTPS или localhost: требуется Web Locks.");
  return new Promise((resolve, reject) => {
    void navigator.locks.request("redmine-reborn-session", { ifAvailable: true }, async (lock) => {
      if (!lock) { reject(new Error("Приложение уже открыто в другой вкладке. Закройте её и обновите страницу.")); return; }
      await new Promise<void>((release) => resolve(release));
    }).catch(reject);
  });
}
