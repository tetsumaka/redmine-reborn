export function AppHeader() {
  return (
    <header className="flex h-[98px] shrink-0 items-center justify-between border-b-2 border-sky-600 bg-zinc-950 px-8 text-zinc-100">
      <div>
        <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-300">
          Рабочее время
        </div>
        <h1 className="text-2xl font-extrabold">Redmine Time Tracker</h1>
      </div>
    </header>
  );
}
