import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { SettingsDialog } from "./components/SettingsDialog";
import { Tabs, type AppTab } from "./components/Tabs";
import { Toast } from "./components/Toast";
import { useAutoSave } from "./hooks/useAutoSave";
import { useToast } from "./hooks/useToast";
import {
  setAppData,
  setSettings as setSettingsAction,
} from "./store/appDataSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import type { Settings } from "./types";
import { TimeEntries } from "src/renderer/pages/TimeEntries";
import { Dashboard } from "src/renderer/pages/Dashboard";
import { TopTasksByTime } from "src/renderer/pages/TopTasksByTime";

export function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const toast = useAppSelector((state) => state.toast.message);
  const { notify, close: closeToast } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>("entries");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useAutoSave(data);

  useEffect(() => {
    let active = true;
    window.timeTracker
      .load()
      .then((loaded) => {
        if (active) dispatch(setAppData(loaded));
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : String(error), "error"),
      );
    return () => {
      active = false;
    };
  }, [dispatch, notify]);

  const saveSettings = async (settings: Settings) => {
    if (!data) return;
    const updated = { ...data, settings };
    await window.timeTracker.save(updated);
    dispatch(setSettingsAction(settings));
    setSettingsOpen(false);
    notify("Настройки сохранены");
  };

  if (!data)
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm font-semibold text-zinc-400">
        Загрузка данных...
      </div>
    );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <Tabs active={activeTab} onChange={setActiveTab} />
        {activeTab === "entries" && <TimeEntries />}
        {activeTab === "tasks" && <TopTasksByTime />}
        {activeTab === "overview" && <Dashboard />}
      </main>
      {settingsOpen && (
        <SettingsDialog
          settings={data.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}
