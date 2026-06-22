import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { DailyActivityChart } from "./components/DailyActivityChart";
import { ProductivityOverview } from "./components/ProductivityOverview";
import { SettingsDialog } from "./components/SettingsDialog";
import { Tabs, type AppTab } from "./components/Tabs";
import { TaskSummaryTable } from "./components/TaskSummaryTable";
import { TimeEntriesTable } from "./components/TimeEntriesTable";
import type { EditableKey } from "./components/TimeEntryRow";
import { Toast, type ToastMessage } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";
import { useAutoSave } from "./hooks/useAutoSave";
import type { AppData, Entry, Settings } from "./types";
import { createEntry, durationMinutes, entryPeriod } from "./utils";

export function App() {
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [data, setData] = useState<AppData | null>(null);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<AppTab>("entries");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useAutoSave(data);

  const notify = useCallback((text: string, kind: ToastMessage["kind"] = "ok") => {
    setToast({ id: Date.now(), text, kind });
  }, []);

  useEffect(() => {
    let active = true;
    window.timeTracker.load()
      .then((loaded) => { if (active) setData(loaded); })
      .catch((error) => notify(error instanceof Error ? error.message : String(error), "error"));
    return () => { active = false; };
  }, [notify]);

  const years = useMemo(() => {
    const values = new Set<number>([currentYear]);
    data?.entries.forEach((entry) => {
      const entryYear = entryPeriod(entry)?.year;
      if (entryYear && entryYear <= currentYear) values.add(entryYear);
    });
    return [...values].sort((left, right) => right - left);
  }, [currentYear, data?.entries]);

  const changeYear = (nextYear: number) => {
    setYear(nextYear);
    if (nextYear === currentYear && month > currentMonth) setMonth(currentMonth);
  };

  const visibleEntries = useMemo(() => data?.entries.filter((entry) => {
    const period = entryPeriod(entry);
    return period?.year === year && period.month === month;
  }) ?? [], [data?.entries, year, month]);

  const summary = useMemo(() => {
    const totalMinutes = visibleEntries.reduce((total, entry) => total + durationMinutes(entry), 0);
    return `${visibleEntries.length} записей · ${Math.floor(totalMinutes / 60)} ч ${totalMinutes % 60} мин`;
  }, [visibleEntries]);

  const addEntry = () => {
    setData((current) => current ? { ...current, entries: [...current.entries, createEntry(year, month)] } : current);
  };

  const changeEntry = (id: string, key: EditableKey, value: string) => {
    setData((current) => current ? {
      ...current,
      entries: current.entries.map((entry) => entry.id === id
        ? { ...entry, [key]: value, synced: false }
        : entry)
    } : current);
  };

  const deleteEntry = (target: Entry) => {
    if (target.synced && !window.confirm("Запись уже отправлена в Redmine. Удалить только локальную строку?")) return;
    setData((current) => current ? { ...current, entries: current.entries.filter((entry) => entry.id !== target.id) } : current);
  };

  const sync = async () => {
    if (!data) return;
    setSyncing(true);
    try {
      await window.timeTracker.save(data);
      const result = await window.timeTracker.sync(year, month);
      setData(await window.timeTracker.load());
      if (result.errors.length) {
        notify(`Отправлено: ${result.synced}. Загружено: ${result.downloaded}. Ошибок: ${result.errors.length}. ${result.errors[0].message}`, "error");
      } else {
        notify(`Отправлено: ${result.synced}. Загружено из Redmine: ${result.downloaded}`);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSyncing(false);
    }
  };

  const saveSettings = async (settings: Settings) => {
    if (!data) return;
    const updated = { ...data, settings };
    await window.timeTracker.save(updated);
    setData(updated);
    setSettingsOpen(false);
    notify("Настройки сохранены");
  };

  if (!data) return <div className="loading">Загрузка данных...</div>;

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main>
        <Tabs active={activeTab} onChange={setActiveTab} />
        <Toolbar
          year={year}
          month={month}
          years={years}
          maxMonth={year === currentYear ? currentMonth : 12}
          summary={summary}
          syncing={syncing}
          showActions={activeTab === "entries"}
          onYearChange={changeYear}
          onMonthChange={setMonth}
          onAdd={addEntry}
          onSync={sync}
        />
        {activeTab === "entries" && <TimeEntriesTable entries={visibleEntries} onChange={changeEntry} onDelete={deleteEntry} />}
        {activeTab === "days" && <DailyActivityChart entries={visibleEntries} />}
        {activeTab === "tasks" && <TaskSummaryTable entries={visibleEntries} />}
        {activeTab === "overview" && <ProductivityOverview entries={visibleEntries} />}
      </main>
      {settingsOpen && <SettingsDialog settings={data.settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
