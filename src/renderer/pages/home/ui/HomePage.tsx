import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "src/renderer/app/providers/store/hooks";
import { Button } from "src/renderer/shared/ui/Button";
import { Tabs } from "src/renderer/shared/ui/Tabs";
import { IssueTable } from "src/renderer/widgets/issue-table";
import { homeIssueFilters } from "../model/filters";
import { useHomeIssues } from "../model/useHomeIssues";

type HomeTab = "myTasks";

const homeTabs: Array<{ value: HomeTab; label: string }> = [
  { value: "myTasks", label: "Мои задачи" },
];

export function HomePage() {
  const settings = useAppSelector((state) => state.appData.data?.settings);
  const { lists, configured, loading, refresh } = useHomeIssues(settings);
  const [activeTab, setActiveTab] = useState<HomeTab>("myTasks");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Tabs
          tabs={homeTabs}
          activeTab={activeTab}
          ariaLabel="Главная"
          className="mb-0 min-w-0 flex-1"
          onTabChange={setActiveTab}
        />
        <Button icon={<RefreshCw size={16} />} onClick={refresh} disabled={!configured || loading}>
          {loading ? "Загрузка…" : "Обновить задачи"}
        </Button>
      </div>
      {activeTab === "myTasks" && (
        <>
          {!configured && (
            <p className="mb-4 shrink-0 rounded-lg border border-sky-800 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
              Для загрузки задач заполните подключение во вкладке «Настройки → Redmine».
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="flex flex-col gap-4">
              {homeIssueFilters.map(({ value, title, description }) => (
                <IssueTable
                  key={value}
                  title={title}
                  description={description}
                  redmineUrl={settings?.redmineUrl ?? ""}
                  configured={configured}
                  showAssignee={value !== "assigned"}
                  {...lists[value]}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
