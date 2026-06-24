import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { ProductivityOverview } from "./components/ProductivityOverview";
import { SettingsDialog } from "./components/SettingsDialog";
import { Tabs, type AppTab } from "./components/Tabs";
import { TaskSummaryTable } from "./components/TaskSummaryTable";
import { TimeEntriesTable } from "./components/TimeEntriesTable";
import { TimeEntryForm } from "./components/TimeEntryForm";
import { Toast, type ToastMessage } from "./components/Toast";
import { DayToolbar, MonthToolbar } from "./components/Toolbar";
import { MONTHS } from "./constants";
import { useAutoSave } from "./hooks/useAutoSave";
import type { AppData, Entry, Settings } from "./types";
import { addDaysIso, durationMinutes, entryPeriod, formatMinutes, isoToDisplayDate, pad, todayIso } from "./utils";

function periodKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

function compareEntriesNewestFirst(left: Entry, right: Entry): number {
  const leftTime = Date.parse(left.createdAt ?? "");
  const rightTime = Date.parse(right.createdAt ?? "");
  const leftHasTime = Number.isFinite(leftTime);
  const rightHasTime = Number.isFinite(rightTime);
  if (leftHasTime && rightHasTime) return rightTime - leftTime;
  if (leftHasTime) return -1;
  if (rightHasTime) return 1;
  return 0;
}

export function App() {
  const [initialDate] = useState(() => todayIso());
  const [initialPeriod] = useState(() => {
    const [year, month] = initialDate.split("-").map(Number);
    return periodKey(year, month);
  });
  const [data, setData] = useState<AppData | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(initialPeriod);
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

  const selectedDisplayDate = useMemo(() => isoToDisplayDate(selectedDate), [selectedDate]);

  const availablePeriods = useMemo(() => {
    const values = new Map<string, { year: number; month: number; label: string }>();
    data?.entries.forEach((entry) => {
      const period = entryPeriod(entry);
      if (!period) return;
      values.set(periodKey(period.year, period.month), {
        ...period,
        label: `${MONTHS[period.month - 1]} ${period.year}`
      });
    });
    return [...values.entries()]
      .map(([value, period]) => ({ value, ...period }))
      .sort((left, right) => right.year - left.year || right.month - left.month);
  }, [data?.entries]);

  useEffect(() => {
    if (!availablePeriods.length) return;
    if (!availablePeriods.some((period) => period.value === selectedPeriodKey)) {
      setSelectedPeriodKey(availablePeriods[0].value);
    }
  }, [availablePeriods, selectedPeriodKey]);

  const monthOptions = useMemo(() => {
    if (availablePeriods.length > 0) {
      return availablePeriods.map((period) => ({ value: period.value, label: period.label }));
    }
    const [year, month] = initialPeriod.split("-").map(Number);
    return [{ value: initialPeriod, label: `${MONTHS[month - 1]} ${year}`, disabled: true }];
  }, [availablePeriods, initialPeriod]);

  const selectedPeriod = useMemo(() => {
    const [year, month] = selectedPeriodKey.split("-").map(Number);
    return { year, month };
  }, [selectedPeriodKey]);

  const visibleMonthEntries = useMemo(() => data?.entries.filter((entry) => {
    const period = entryPeriod(entry);
    return period?.year === selectedPeriod.year && period.month === selectedPeriod.month;
  }) ?? [], [data?.entries, selectedPeriod.month, selectedPeriod.year]);

  const visibleDayEntries = useMemo(() => {
    const entries = data?.entries.filter((entry) => entry.date === selectedDisplayDate) ?? [];
    return [...entries].sort(compareEntriesNewestFirst);
  }, [data?.entries, selectedDisplayDate]);

  const daySummary = useMemo(() => {
    const totalMinutes = visibleDayEntries.reduce((total, entry) => total + durationMinutes(entry), 0);
    return `${visibleDayEntries.length} записей · ${formatMinutes(totalMinutes)}`;
  }, [visibleDayEntries]);

  const monthSummary = useMemo(() => {
    const totalMinutes = visibleMonthEntries.reduce((total, entry) => total + durationMinutes(entry), 0);
    return `${visibleMonthEntries.length} записей · ${formatMinutes(totalMinutes)}`;
  }, [visibleMonthEntries]);

  const addEntry = (entry: Entry) => {
    setData((current) => current ? { ...current, entries: [entry, ...current.entries] } : current);
  };

  const deleteEntry = (target: Entry) => {
    setData((current) => current ? { ...current, entries: current.entries.filter((entry) => entry.id !== target.id) } : current);
  };

  const sync = async () => {
    if (!data) return;
    setSyncing(true);
    try {
      await window.timeTracker.save(data);
      const result = await window.timeTracker.sync(selectedDisplayDate);
      setData(await window.timeTracker.load());
      if (result.errors.length) {
        notify(`Отправлено: ${result.synced}. Загружено: ${result.downloaded}. Удалено: ${result.deleted}. Ошибок: ${result.errors.length}. ${result.errors[0].message}`, "error");
      } else {
        notify(`Отправлено: ${result.synced}. Загружено из Redmine: ${result.downloaded}. Удалено: ${result.deleted}`);
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

  if (!data) return <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm font-semibold text-zinc-400">Загрузка данных...</div>;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <Tabs active={activeTab} onChange={setActiveTab} />
        {activeTab === "entries" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <DayToolbar
              selectedDate={selectedDate}
              summary={daySummary}
              syncing={syncing}
              onDateChange={setSelectedDate}
              onPreviousDay={() => setSelectedDate((current) => addDaysIso(current, -1))}
              onNextDay={() => setSelectedDate((current) => addDaysIso(current, 1))}
              onSync={sync}
            />
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <TimeEntryForm date={selectedDisplayDate} onAdd={addEntry} />
              <TimeEntriesTable entries={visibleDayEntries} redmineUrl={data.settings.redmineUrl} onDelete={deleteEntry} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <MonthToolbar
              value={selectedPeriodKey}
              options={monthOptions}
              summary={monthSummary}
              onChange={setSelectedPeriodKey}
            />
            {activeTab === "tasks" && <TaskSummaryTable entries={visibleMonthEntries} />}
            {activeTab === "overview" && (
              <div className="min-h-0 flex-1 overflow-auto">
                <ProductivityOverview entries={visibleMonthEntries} />
              </div>
            )}
          </div>
        )}
      </main>
      {settingsOpen && <SettingsDialog settings={data.settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
