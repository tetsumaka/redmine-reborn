import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
 * Преобразует хранимую ISO-дату
 * в формат текстового поля.
 * Пример: "2026-10-12" -> "12.10.2026".
 */
function isoToInputDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

/*
 * Преобразует дату из текстового поля обратно в ISO,
 * если дата существует.
 * Пример:
 * "12.10.2026" -> "2026-10-12",
 * "31.02.2026" -> null.
 */
function inputDateToIso(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/*
 * Оставляет только цифры даты
 * и расставляет точки по мере ввода.
 * Пример: "12102026" -> "12.10.2026".
 */
function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4),
  ].join(".");
}

type DatePickerProps = {
  label?: string;
  value: string;
  onDateChange: (value: string) => void;
};

export function DatePicker({
  label,
  value,
  onDateChange,
}: DatePickerProps) {
  const [draft, setDraft] = useState(() => isoToInputDate(value));
  const nativeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(isoToInputDate(value));
  }, [value]);

  const openCalendar = () => {
    const nativeInput = nativeInputRef.current;
    if (!nativeInput) return;
    if (typeof nativeInput.showPicker === "function") {
      nativeInput.showPicker();
      return;
    }
    nativeInput.click();
  };

  return (
    <label
      className={`
        flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-300
      `}
    >
      {label && <span>{label}</span>}
      <div
        className={`
          relative grid grid-cols-[1fr_40px]
        `}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{2}\.\d{2}\.\d{4}"
          placeholder="дд.мм.гггг"
          value={draft}
          onChange={(event) => {
            const nextDraft = maskDateInput(event.target.value);
            setDraft(nextDraft);
            const nextIso = inputDateToIso(nextDraft);
            if (nextIso) onDateChange(nextIso);
          }}
          onBlur={() => {
            if (!inputDateToIso(draft)) setDraft(isoToInputDate(value));
          }}
          className="
            h-10 min-w-0 rounded-md rounded-r-none border border-r-0
            border-zinc-700 bg-zinc-950 px-3 font-mono text-sm
            tabular-nums text-zinc-100 outline-none transition
            placeholder:text-zinc-600 focus:border-sky-400
            focus:ring-2 focus:ring-sky-500/30
            disabled:cursor-not-allowed disabled:opacity-60
          "
        />
        <button
          type="button"
          aria-label="Открыть календарь"
          title="Открыть календарь"
          onClick={openCalendar}
          className="
            flex h-10 items-center justify-center rounded-r-md border
            border-zinc-700 bg-zinc-800 text-zinc-300 transition
            hover:bg-zinc-700 hover:text-zinc-100 focus:outline-none
            focus:ring-2 focus:ring-sky-500/35
          "
        >
          <CalendarDays size={16} />
        </button>
        <input
          ref={nativeInputRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={(event) => {
            if (event.target.value) onDateChange(event.target.value);
          }}
          className="pointer-events-none absolute right-0 top-full size-px opacity-0"
        />
      </div>
    </label>
  );
}
