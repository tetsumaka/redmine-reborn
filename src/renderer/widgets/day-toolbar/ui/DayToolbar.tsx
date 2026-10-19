import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "src/renderer/shared/ui/DatePicker";
import { Button } from "src/renderer/shared/ui/Button";

type DayToolbarProps = {
  selectedDate: string;
  summary: string;
  syncing: boolean;
  onDateChange: (date: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
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
      <div className="flex items-end gap-2">
        <Button
          icon={<ChevronLeft size={18} />}
          iconOnly
          fill="outline"
          ariaLabel="Предыдущий день"
          tooltip="Предыдущий день"
          onClick={props.onPreviousDay}
        />
        <div className="w-[160px]">
          <DatePicker
            label="День"
            value={props.selectedDate}
            onDateChange={props.onDateChange}
          />
        </div>
        <Button
          icon={<ChevronRight size={18} />}
          iconOnly
          fill="outline"
          ariaLabel="Следующий день"
          tooltip="Следующий день"
          onClick={props.onNextDay}
        />
        <span className="pb-2 pl-2 text-sm font-semibold text-zinc-500">
          {props.summary}
        </span>
      </div>
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
              className="absolute right-0 top-11 z-20 w-72 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black/50"
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
