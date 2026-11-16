import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";

type MenuItem = { label: string; description: string; onSelect: () => void; danger?: boolean };
type Props = { label: string; icon: ReactNode; disabled?: boolean; items: MenuItem[] };

export function DropdownMenu({ label, icon, disabled, items }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
    if (!buttons.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  };
  return <div ref={root} className="relative" onKeyDown={keyboard}>
    <button ref={trigger} type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-sky-500 bg-sky-600 px-3 text-sm font-bold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/35 disabled:cursor-not-allowed disabled:opacity-55"
      onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      {icon}<span>{label}</span><ChevronDown size={16} />
    </button>
    {open && <div ref={menu} id={id} role="menu" aria-label={label} className="absolute right-0 top-full z-20 mt-1 w-80 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black/50">
      {items.map((item) => <button key={item.label} type="button" role="menuitem" tabIndex={-1}
        className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none ${item.danger ? "text-red-200" : "text-zinc-100"}`}
        onClick={() => { setOpen(false); trigger.current?.focus(); item.onSelect(); }}>
        <span className="font-bold">{item.label}</span><span className="text-xs text-zinc-400">{item.description}</span>
      </button>)}
    </div>}
  </div>;
}
