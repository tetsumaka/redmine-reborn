import type { ChangeEvent } from "react";

type TimePickerProps = {
  label?: string;
  mode?: "clock" | "duration";
  ariaLabel?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function TimePicker({
  label,
  mode = "clock",
  ariaLabel,
  value,
  onChange,
}: TimePickerProps) {
  return (
    <label
      className={`
        flex min-w-0 flex-col gap-1 text-xs font-semibold text-zinc-300
      `}
    >
      {label && <span>{label}</span>}
      <input
        type={mode === "duration" ? "text" : "time"}
        inputMode={mode === "duration" ? "numeric" : undefined}
        placeholder={mode === "duration" ? "01:30" : undefined}
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        className={`
          h-8 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-2
          font-mono text-sm tabular-nums text-zinc-100 outline-none transition
          placeholder:text-zinc-600 focus:border-sky-400
          focus:ring-2 focus:ring-sky-500/30
          disabled:cursor-not-allowed disabled:opacity-60
        `}
      />
    </label>
  );
}
