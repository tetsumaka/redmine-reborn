type TabItem<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  tabs: Array<TabItem<T>>;
  activeTab: T;
  ariaLabel?: string;
  className?: string;
  onTabChange: (tab: T) => void;
};

export function Tabs<T extends string>({
  tabs,
  activeTab,
  ariaLabel = "Tabs",
  className = "mb-3",
  onTabChange,
}: TabsProps<T>) {
  return (
    <nav
      className={`inline-flex shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-1 ${className}`}
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`h-8 rounded-md px-3 text-sm font-bold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 ${
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
