type ButtonToggleProps<T extends string> = {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

export function ButtonToggle<T extends string>({
  value,
  options,
  onChange,
}: ButtonToggleProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-950 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded px-3 text-xs font-bold text-zinc-400 transition hover:text-zinc-100 ${
            value === option.value ? "bg-sky-600 text-white shadow-sm" : ""
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
