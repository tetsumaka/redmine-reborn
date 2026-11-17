import { loadAppData } from "src/entities/app-data";
import { isSynchronizing, onSynchronizationChanged } from "src/shared/lib/data-operations";
import { useEffect, useState } from "react";
import { AppHeader } from "src/widgets/app-header";
import { RedmineSettingsPage } from "src/pages/redmine-settings";
import { NotificationSettingsPage } from "src/pages/notification-settings";
import { DataSettingsPage } from "src/pages/data-settings";
import { useToast } from "src/features/show-toast";
import { Tabs } from "src/shared/ui/Tabs";
import { Toast } from "src/features/show-toast";
import { setAppData } from "src/entities/app-data";
import { useAppDispatch, useAppSelector } from "src/shared/lib/store";
import { TimeEntriesPage } from "src/pages/time-entries";
import { DashboardPage } from "src/pages/dashboard";
import { TopTasksByTimePage } from "src/pages/top-tasks-by-time";
import { HomePage } from "src/pages/home";

type AppTab = "home" | "time" | "settings";
type TimeTab = "entries" | "tasks" | "overview";
type SettingsTab = "redmine" | "events" | "data";

const appTabs: Array<{ value: AppTab; label: string }> = [
  { value: "home", label: "Главная" },
  { value: "time", label: "Учёт времени" },
  { value: "settings", label: "Настройки" },
];

const timeTabs: Array<{ value: TimeTab; label: string }> = [
  { value: "entries", label: "Записи времени" },
  { value: "overview", label: "Обзор месяца" },
  { value: "tasks", label: "По задачам" },
];

const settingsTabs: Array<{ value: SettingsTab; label: string }> = [
  { value: "redmine", label: "Redmine" },
  { value: "events", label: "События" },
  { value: "data", label: "Данные" },
];

export function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const toastMessages = useAppSelector((state) => state.toast.messages);
  const { notify, close: closeToast } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [busy, setBusy] = useState(() => isSynchronizing());
  const [activeTimeTab, setActiveTimeTab] = useState<TimeTab>("entries");
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("redmine");

  useEffect(() => onSynchronizationChanged(setBusy), []);

  useEffect(() => {
    let active = true;
    loadAppData()
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

  if (!data)
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm font-semibold text-zinc-400">
        Загрузка данных...
      </div>
    );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <AppHeader redmineConfigured={Boolean(data.settings.redmineUrl && data.settings.apiKey)} />
      <main className="flex min-h-0 flex-1 flex-col px-4 py-4" aria-busy={busy}>
        <fieldset disabled={busy} className="flex min-h-0 flex-1 flex-col">
        <Tabs
          tabs={appTabs}
          activeTab={activeTab}
          ariaLabel="Разделы приложения"
          onTabChange={setActiveTab}
        />
        {activeTab === "home" && <HomePage />}
        {activeTab === "time" && (
          <>
            <Tabs
              tabs={timeTabs}
              activeTab={activeTimeTab}
              ariaLabel="Учёт времени"
              onTabChange={setActiveTimeTab}
            />
            {activeTimeTab === "entries" && <TimeEntriesPage />}
            {activeTimeTab === "overview" && <DashboardPage />}
            {activeTimeTab === "tasks" && <TopTasksByTimePage />}
          </>
        )}
        {activeTab === "settings" && (
          <>
            <Tabs
              tabs={settingsTabs}
              activeTab={activeSettingsTab}
              ariaLabel="Настройки"
              onTabChange={setActiveSettingsTab}
            />
            {activeSettingsTab === "redmine" && (
              <RedmineSettingsPage />
            )}
            {activeSettingsTab === "events" && <NotificationSettingsPage />}
            {activeSettingsTab === "data" && <DataSettingsPage />}
          </>
        )}
        </fieldset>
      </main>
      <Toast messages={toastMessages} onClose={closeToast} />
    </div>
  );
}
