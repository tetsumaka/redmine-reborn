import { exportBackup, importBackup } from "src/entities/app-data";
import { requestPersistentStorage, estimateStorage, formatStorageBytes, type StorageUsage } from "src/shared/lib/storage-estimate";
import { todayIso } from "src/shared/lib/date";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Download, Upload, Database } from "lucide-react";
import { Button } from "src/shared/ui/Button";
import { useToast } from "src/features/show-toast";
import { useAppDispatch } from "src/shared/lib/store";
import { setAppData } from "src/entities/app-data";

export function DataSettingsPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [includeKey, setIncludeKey] = useState(false);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageState, setStorageState] = useState<"loading" | "ready" | "unavailable">("loading");
  const refreshStorage = useCallback(async () => {
    try {
      const result = await estimateStorage();
      setStorage(result);
      setStorageState(result ? "ready" : "unavailable");
    } catch { setStorageState("unavailable"); }
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await estimateStorage();
        if (active) { setStorage(result); setStorageState(result ? "ready" : "unavailable"); }
      } catch { if (active) setStorageState("unavailable"); }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 10_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const percent = storage ? Math.min(100, Math.max(0, storage.usage / storage.quota * 100)) : 0;

  const exportData = async () => {
    setBusy(true);
    try {
      const backup = await exportBackup();
      if (!includeKey) backup.data.settings.apiKey = "";
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `redmine-reborn-${todayIso()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notify(String(error), "error"); }
    finally { setBusy(false); }
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !window.confirm("Заменить все текущие записи, настройки и историю событий данными из файла?")) return;
    setBusy(true);
    try {
      const loaded = await importBackup(JSON.parse(await file.text()));
      dispatch(setAppData(loaded));
      await refreshStorage();
      notify("Данные импортированы. Проверьте API-ключ в настройках Redmine.");
    } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
    finally { setBusy(false); }
  };

  const persist = async () => {
    try {
      const granted = await requestPersistentStorage();
      await refreshStorage();
      notify(granted ? "Постоянное хранение разрешено" : "Постоянное хранение не предоставлено. Делайте резервные копии.", granted ? "ok" : "error");
    } catch (error) { notify(String(error), "error"); }
  };

  return <section className="min-h-0 flex-1 overflow-auto">
    <fieldset disabled={busy} className="max-w-3xl space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6 disabled:opacity-60">
      <h2 className="text-lg font-extrabold">Локальные данные</h2>
      <p className="text-sm leading-relaxed text-zinc-400">Записи, настройки и события хранятся в IndexedDB локального профиля приложения. Удаление профиля удалит эти данные. Для переноса из браузерной версии экспортируйте JSON в браузере и импортируйте его здесь.</p>
      <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3" aria-live="polite">
        <h3 className="text-sm font-bold">Использование хранилища</h3>
        {storageState === "loading" ? <p className="text-xs text-zinc-400">Получение оценки хранилища…</p>
          : storageState === "unavailable" || !storage ? <p className="text-xs text-zinc-400">Оценка занятого места и квоты недоступна.</p>
          : <>
            <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
              <span>{formatStorageBytes(storage.usage)} из {formatStorageBytes(storage.quota)}</span>
              <span>{percent.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%</span>
            </div>
            <progress max={100} value={percent} aria-label="Занято хранилища приложения" className="block h-2 w-full overflow-hidden rounded-full accent-sky-500" />
            {storage.indexedDB !== undefined && <p className="text-xs text-zinc-400">Из них IndexedDB: {formatStorageBytes(storage.indexedDB)}</p>}
            <p className="text-xs text-zinc-400">Постоянное хранение: {storage.persistent ? "разрешено" : "не предоставлено"}.</p>
          </>}
        <p className="text-xs leading-relaxed text-zinc-500">Приблизительная оценка хранилища приложения от Chromium. IndexedDB использует общую квоту с другими локальными хранилищами приложения; квота может меняться.</p>
      </div>
      <Button icon={<Database size={16} />} onClick={() => { void persist(); }}>Запросить постоянное хранение</Button>
      <div className="space-y-3 border-t border-zinc-800 pt-5">
        <h3 className="font-bold">Резервная копия</h3>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeKey} onChange={(event) => setIncludeKey(event.target.checked)} />Включить API-ключ в файл</label>
        <Button icon={<Download size={16} />} onClick={() => { void exportData(); }}>Экспорт JSON</Button>
      </div>
      <div className="space-y-3 border-t border-zinc-800 pt-5">
        <h3 className="flex items-center gap-2 font-bold"><Upload size={16} />Импорт</h3>
        <p className="text-sm text-zinc-400">Выберите резервную копию или data.json старого десктопного приложения. Импорт полностью заменяет текущие данные. История из старой events.sqlite не импортируется.</p>
        <input type="file" accept="application/json,.json" aria-label="Файл резервной копии" className="block h-8 text-sm file:mr-3 file:h-8 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100" onChange={(event) => { void importData(event); }} />
      </div>
    </fieldset>
  </section>;
}
