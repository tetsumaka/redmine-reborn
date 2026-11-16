import type { ChangeEvent } from "react";

type NumberInputProps = {
  label?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function NumberInput({
  label,
  min,
  max,
  placeholder,
  required,
  value,
  onChange,
}: NumberInputProps) {
  return (
    <label
      className={`
        flex min-w-0 flex-col gap-1 text-xs font-semibold text-zinc-300
      `}
    >
      {label && <span>{label}</span>}
      <input
        type="number"
        min={min}
        max={max}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className={`
          h-8 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-2
          text-sm text-zinc-100 outline-none transition
          placeholder:text-zinc-600 focus:border-sky-400
          focus:ring-2 focus:ring-sky-500/30
          disabled:cursor-not-allowed disabled:opacity-60
        `}
      />
    </label>
  );
}
