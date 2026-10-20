import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "src/renderer/app/providers/store/hooks";
import { Button } from "src/renderer/shared/ui/Button";
import { Tabs } from "src/renderer/shared/ui/Tabs";
import { IssueTable } from "src/renderer/widgets/issue-table";
import { homeIssueFilters } from "../model/filters";
import { useHomeIssues } from "../model/useHomeIssues";
import { CustomFilters } from "./CustomFilters";

type HomeTab = "myTasks" | "filters";

const homeTabs: Array<{ value: HomeTab; label: string }> = [
  { value: "myTasks", label: "Мои задачи" },
  { value: "filters", label: "Фильтры" },
];

export function HomePage() {
  const settings = useAppSelector((state) => state.appData.data?.settings);
  const [activeTab, setActiveTab] = useState<HomeTab>("myTasks");
  const { lists, configured, loading, refresh } = useHomeIssues(settings, activeTab === "myTasks");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        tabs={homeTabs}
        activeTab={activeTab}
        ariaLabel="Главная"
        onTabChange={setActiveTab}
      />
      {activeTab === "myTasks" && (
        <>
          <div className="mb-3 flex shrink-0 justify-end">
            <Button icon={<RefreshCw size={16} />} onClick={refresh} disabled={!configured || loading}>
              {loading ? "Загрузка…" : "Обновить задачи"}
            </Button>
          </div>
          {!configured && (
            <p className="mb-4 shrink-0 rounded-lg border border-sky-800 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
              Для загрузки задач заполните подключение во вкладке «Настройки → Redmine».
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="grid grid-cols-3 items-start gap-4">
              {homeIssueFilters.map(({ value, title, description }) => {
                const compact = value !== "assigned" && value !== "watched";
                return (
                  <div key={value} className={compact ? "min-w-0" : "col-span-3 min-w-0"}>
                    <IssueTable
                      title={title}
                      description={description}
                      redmineUrl={settings?.redmineUrl ?? ""}
                      configured={configured}
                      showAssignee={value !== "assigned"}
                      compact={compact}
                      detailColumnOrder={value === "watched" ? ["assignedTo", "status", "tracker", "priority", "project"] : undefined}
                      {...lists[value]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      {activeTab === "filters" && <CustomFilters />}
    </div>
  );
}
