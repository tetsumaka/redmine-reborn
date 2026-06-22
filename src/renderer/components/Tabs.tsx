export type AppTab = "entries" | "days" | "tasks" | "overview";

const TABS: Array<{ id: AppTab; label: string }> = [
  { id: "entries", label: "Учёт времени" },
  { id: "days", label: "По дням" },
  { id: "tasks", label: "По задачам" },
  { id: "overview", label: "Обзор" }
];

export function Tabs({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <nav className="tabs" aria-label="Разделы приложения">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
