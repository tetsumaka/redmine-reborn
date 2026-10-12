import type { ChangeEvent } from "react";

type SelectorProps = {
  label?: string;
  value: string | number;
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export function Selector({ label, value, options, onChange }: SelectorProps) {
  return (
    <label
      className={`
        flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-300
      `}
    >
      {label && <span>{label}</span>}
      <span className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`
            h-10 w-full min-w-0 appearance-none rounded-md border
            border-zinc-700 bg-zinc-950 px-3 pr-9 text-sm text-zinc-100
            outline-none transition placeholder:text-zinc-600
            focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30
            disabled:cursor-not-allowed disabled:opacity-60
          `}
        >
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span
          className="
            pointer-events-none absolute right-3 top-1/2 size-0
            -translate-y-1/2 border-x-[4px] border-t-[5px]
            border-x-transparent border-t-zinc-400
          "
        />
      </span>
    </label>
  );
}
