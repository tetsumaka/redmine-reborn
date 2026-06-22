type HeaderProps = { onOpenSettings: () => void };

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <div className="eyebrow">Рабочее время</div>
        <h1>Redmine Time Tracker</h1>
      </div>
      <button className="button secondary" onClick={onOpenSettings}>Настройки Redmine</button>
    </header>
  );
}
