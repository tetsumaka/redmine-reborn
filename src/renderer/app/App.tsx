import { useEffect, useState } from "react";
import { AppHeader } from "src/renderer/widgets/app-header";
import { RedmineSettingsPage } from "src/renderer/pages/redmine-settings";
import { useAutoSave } from "src/renderer/app/model/useAutoSave";
import { useToast } from "src/renderer/features/show-toast";
import { Tabs } from "src/renderer/shared/ui/Tabs";
import { Toast } from "src/renderer/features/show-toast";
import { setAppData } from "src/renderer/entities/app-data";
import {
  useAppDispatch,
  useAppSelector,
} from "src/renderer/app/providers/store/hooks";
import { TimeEntriesPage } from "src/renderer/pages/time-entries";
import { DashboardPage } from "src/renderer/pages/dashboard";
import { TopTasksByTimePage } from "src/renderer/pages/top-tasks-by-time";
import { api } from "src/renderer/shared/api/api";

type AppTab = "time" | "settings";
type TimeTab = "entries" | "tasks" | "overview";
type SettingsTab = "redmine";

const appTabs: Array<{ value: AppTab; label: string }> = [
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
];

export function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const toastMessages = useAppSelector((state) => state.toast.messages);
  const { notify, close: closeToast } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>("time");
  const [activeTimeTab, setActiveTimeTab] = useState<TimeTab>("entries");
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("redmine");

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

  if (!data)
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm font-semibold text-zinc-400">
        Загрузка данных...
      </div>
    );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <Tabs
          tabs={appTabs}
          activeTab={activeTab}
          ariaLabel="Разделы приложения"
          onTabChange={setActiveTab}
        />
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
          </>
        )}
      </main>
      <Toast messages={toastMessages} onClose={closeToast} />
    </div>
  );
}
