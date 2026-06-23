import { cn } from "./ui";

export type AppTab = "entries" | "tasks" | "overview";

const TABS: Array<{ id: AppTab; label: string }> = [
  { id: "entries", label: "Учёт времени" },
  { id: "overview", label: "Обзор месяца" },
  { id: "tasks", label: "По задачам" }
];

export function Tabs({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <nav className="mb-5 inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1" aria-label="Разделы приложения">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={cn(
            "h-9 rounded-md px-4 text-sm font-bold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100",
            active === tab.id && "bg-sky-600/20 text-sky-100 ring-1 ring-inset ring-sky-500/50"
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
