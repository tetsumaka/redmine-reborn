import {
  ChevronDown,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "src/renderer/shared/ui/DayPicker";
import { Button } from "src/renderer/shared/ui/Button";

type DayToolbarProps = {
  selectedDate: string;
  summary: string;
  syncing: boolean;
  onDateChange: (date: string) => void;
  onPullDay: () => void;
  onPullMonth: () => void;
  onOverwriteDay: () => void;
};

export function DayToolbar(props: DayToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
      <DayPicker
        selectedDate={props.selectedDate}
        onDateChange={props.onDateChange}
        summary={props.summary}
      />
      <div className="flex items-center gap-2">
        <div ref={menuRef} className="relative">
          <Button
            variant="primary"
            disabled={props.syncing}
            icon={<RefreshCw size={16} />}
            onClick={() => setMenuOpen((open) => !open)}
            ariaHasPopup="menu"
            ariaExpanded={menuOpen}
          >
            <span>
              {props.syncing ? "Обновление..." : "Обновить из Redmine"}
            </span>
            <ChevronDown size={16} />
          </Button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black/50"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none"
                onClick={() => runMenuAction(props.onPullDay)}
              >
                <span className="font-bold">Обновить выбранный день</span>
                <span className="text-xs text-zinc-400">
                  Будут загружены записи за выбранный день. Несинхронизированные
                  записи останутся.
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none"
                onClick={() => runMenuAction(props.onPullMonth)}
              >
                <span className="font-bold">Обновить месяц</span>
                <span className="text-xs text-zinc-400">
                  Будет загружены записи за месяц выбранного дня.
                  Несинхронизированные записи останутся.
                </span>
              </button>
            </div>
          )}
        </div>
        <Button
          variant="danger"
          fill="outline"
          disabled={props.syncing}
          icon={<UploadCloud size={16} />}
          onClick={props.onOverwriteDay}
        >
          Перезаписать Redmine...
        </Button>
      </div>
    </section>
  );
}
