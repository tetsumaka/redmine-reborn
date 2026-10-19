import type { AppSettings } from "src/shared/types";
import { useEffect, useState } from "react";
import { AppHeader } from "src/renderer/widgets/app-header";
import { SettingsDialog } from "src/renderer/widgets/settings-dialog";
import { useAutoSave } from "src/renderer/app/model/useAutoSave";
import { useToast } from "src/renderer/features/show-toast";
import { Tabs } from "src/renderer/shared/ui/Tabs";
import { Toast } from "src/renderer/features/show-toast";
import {
  setAppData,
  setSettings as setSettingsAction,
} from "src/renderer/entities/app-data";
import {
  useAppDispatch,
  useAppSelector,
} from "src/renderer/app/providers/store/hooks";
import { TimeEntriesPage } from "src/renderer/pages/time-entries";
import { DashboardPage } from "src/renderer/pages/dashboard";
import { TopTasksByTimePage } from "src/renderer/pages/top-tasks-by-time";
import { api } from "src/renderer/shared/api/api";

type AppTab = "entries" | "tasks" | "overview";

const appTabs: Array<{ value: AppTab; label: string }> = [
  { value: "entries", label: "Учёт времени" },
  { value: "overview", label: "Обзор месяца" },
  { value: "tasks", label: "По задачам" },
];

export function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const toastMessages = useAppSelector((state) => state.toast.messages);
  const { notify, close: closeToast } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>("entries");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useAutoSave(data);

  useEffect(() => {
    let active = true;
    api()
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

  const saveSettings = async (settings: AppSettings) => {
    if (!data) return;
    const updated = { ...data, settings };
    await api().save(updated);
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
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <Tabs
          tabs={appTabs}
          activeTab={activeTab}
          ariaLabel="Разделы приложения"
          onTabChange={setActiveTab}
        />
        {activeTab === "entries" && <TimeEntriesPage />}
        {activeTab === "tasks" && <TopTasksByTimePage />}
        {activeTab === "overview" && <DashboardPage />}
      </main>
      {settingsOpen && (
        <SettingsDialog
          settings={data.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
      <Toast messages={toastMessages} onClose={closeToast} />
    </div>
  );
}
