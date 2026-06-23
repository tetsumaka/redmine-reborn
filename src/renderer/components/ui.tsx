import { CalendarDays } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type DialogHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type FieldWrapperProps = {
  label?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

function FieldWrapper({ label, error, children, className }: FieldWrapperProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-300", className)}>
      {label && <span>{label}</span>}
      {children}
      {error && <span className="text-xs font-medium text-red-300">{error}</span>}
    </label>
  );
}

const inputClassName = "h-10 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  inputClassName?: string;
};

export function TextInput({ label, error, className, inputClassName: controlClassName, type = "text", ...props }: TextInputProps) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <input {...props} type={type} className={cn(inputClassName, controlClassName)} />
    </FieldWrapper>
  );
}

export function NumberInput({ label, error, className, inputClassName: controlClassName, ...props }: Omit<TextInputProps, "type">) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <input {...props} type="number" className={cn(inputClassName, controlClassName)} />
    </FieldWrapper>
  );
}

function isoToInputDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function inputDateToIso(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  label?: string;
  error?: string;
  inputClassName?: string;
  value: string;
  onDateChange: (value: string) => void;
};

export function DatePicker({ label, error, className, inputClassName: controlClassName, value, onDateChange, onBlur, ...props }: DatePickerProps) {
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
    <FieldWrapper label={label} error={error} className={className}>
      <div className={cn("relative grid grid-cols-[1fr_40px]", controlClassName)}>
        <input
          {...props}
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
          onBlur={(event) => {
            if (!inputDateToIso(draft)) setDraft(isoToInputDate(value));
            onBlur?.(event);
          }}
          className={cn(inputClassName, "rounded-r-none border-r-0 font-mono tabular-nums")}
        />
        <button
          type="button"
          aria-label="Открыть календарь"
          title="Открыть календарь"
          onClick={openCalendar}
          className="flex h-10 items-center justify-center rounded-r-md border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
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
    </FieldWrapper>
  );
}

type TimePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  inputClassName?: string;
  mode?: "clock" | "duration";
};

export function TimePicker({ label, error, className, inputClassName: controlClassName, mode = "clock", ...props }: TimePickerProps) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <input
        {...props}
        type={mode === "duration" ? "text" : "time"}
        inputMode={mode === "duration" ? "numeric" : props.inputMode}
        placeholder={mode === "duration" ? props.placeholder ?? "01:30" : props.placeholder}
        className={cn(inputClassName, "font-mono tabular-nums", controlClassName)}
      />
    </FieldWrapper>
  );
}

export type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type SelectorProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  selectClassName?: string;
};

export function Selector({ label, error, className, selectClassName, options, ...props }: SelectorProps) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <select {...props} className={cn(inputClassName, "pr-8", selectClassName)}>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  fill?: "fill" | "outline";
  icon?: ReactNode;
  iconOnly?: boolean;
};

export function Button({
  variant = "secondary",
  fill = "fill",
  icon,
  iconOnly = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const filled = variant === "primary"
    ? "border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-950/30 hover:bg-sky-500"
    : "border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-700";
  const outlined = variant === "primary"
    ? "border-sky-500/70 bg-transparent text-sky-200 hover:bg-sky-500/10"
    : "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800";

  return (
    <button
      {...props}
      type={type}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500/35 disabled:cursor-not-allowed disabled:opacity-55",
        fill === "fill" ? filled : outlined,
        iconOnly && "w-10 px-0",
        className
      )}
    >
      {icon && <span className="flex size-4 items-center justify-center">{icon}</span>}
      {!iconOnly && children}
    </button>
  );
}

type ButtonToggleProps<T extends string> = {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
};

export function ButtonToggle<T extends string>({ value, options, onChange, className }: ButtonToggleProps<T>) {
  return (
    <div className={cn("inline-flex rounded-md border border-zinc-700 bg-zinc-950 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded px-3 text-xs font-bold text-zinc-400 transition hover:text-zinc-100",
            value === option.value && "bg-sky-600 text-white shadow-sm"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/25", className)}>
      <div className="max-h-[calc(100vh-390px)] overflow-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-zinc-800 text-[11px] uppercase text-zinc-400">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-800">{children}</tbody>;
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("transition hover:bg-zinc-800/70", className)}>{children}</tr>;
}

export function TableHeadCell({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("h-11 whitespace-nowrap px-4 py-3 font-extrabold tracking-wide", className)}>{children}</th>;
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("h-14 px-4 py-3 align-middle text-zinc-200", className)}>{children}</td>;
}

export const ModalWindow = forwardRef<HTMLDialogElement, DialogHTMLAttributes<HTMLDialogElement>>(
  ({ children, className, ...props }, ref) => (
    <dialog
      {...props}
      ref={ref}
      className={cn("fixed left-1/2 top-1/2 max-h-[calc(100vh-40px)] w-[min(760px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-sm", className)}
    >
      {children}
    </dialog>
  )
);

ModalWindow.displayName = "ModalWindow";
