type TabItem<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  tabs: Array<TabItem<T>>;
  activeTab: T;
  ariaLabel?: string;
  onTabChange: (tab: T) => void;
};

export function Tabs<T extends string>({
  tabs,
  activeTab,
  ariaLabel = "Tabs",
  onTabChange,
}: TabsProps<T>) {
  return (
    <nav
      className="mb-3 inline-flex shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-1"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`h-9 rounded-md px-4 text-sm font-bold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 ${
            activeTab === tab.value
              ? "bg-sky-600/20 text-sky-100 ring-1 ring-inset ring-sky-500/50"
              : ""
          }`}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
