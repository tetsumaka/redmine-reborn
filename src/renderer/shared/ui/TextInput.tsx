import type { ChangeEvent } from "react";

type TextInputProps = {
  label?: string;
  type?: "text" | "url" | "password";
  placeholder?: string;
  required?: boolean;
  value: string;
  autoComplete?: string;
  readOnly?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function TextInput({
  label,
  type = "text",
  placeholder,
  required,
  value,
  autoComplete,
  readOnly,
  onChange,
}: TextInputProps) {
  return (
    <label
      className={`
        flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-300
      `}
    >
      {label && <span>{label}</span>}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        autoComplete={autoComplete}
        readOnly={readOnly}
        onChange={onChange}
        className={`
          h-10 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3
          text-sm text-zinc-100 outline-none transition
          placeholder:text-zinc-600 focus:border-sky-400
          focus:ring-2 focus:ring-sky-500/30
          disabled:cursor-not-allowed disabled:opacity-60
        `}
      />
    </label>
  );
}
