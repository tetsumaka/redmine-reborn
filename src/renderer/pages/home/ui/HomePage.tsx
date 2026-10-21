import { useState } from "react";
import { useAppSelector } from "src/renderer/app/providers/store/hooks";
import { todayIso } from "src/renderer/shared/lib/date";
import { Tabs } from "src/renderer/shared/ui/Tabs";
import { CustomFilters } from "./CustomFilters";
import { IssueEvents } from "./IssueEvents";

type HomeTab = "filters" | "events";
const homeTabs: Array<{ value: HomeTab; label: string }> = [
  { value: "filters", label: "Мои фильтры" },
  { value: "events", label: "События" },
];

export function HomePage() {
  const settings = useAppSelector((state) => state.appData.data?.settings);
  const [activeTab, setActiveTab] = useState<HomeTab>("filters");
  const [eventsDate, setEventsDate] = useState(todayIso);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs tabs={homeTabs} activeTab={activeTab} ariaLabel="Главная" onTabChange={setActiveTab} />
      {activeTab === "filters" && <CustomFilters />}
      {activeTab === "events" && <IssueEvents settings={settings} selectedDate={eventsDate} onDateChange={setEventsDate} />}
    </div>
  );
}
