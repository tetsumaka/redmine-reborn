import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "src/renderer/shared/ui/Button";
import { Selector } from "src/renderer/shared/ui/Selector";

type Props<Column extends string> = {
  columns: Column[] | null;
  options: ReadonlyArray<{ value: Column; label: string }>;
  defaultColumns: readonly Column[];
  defaultDescription?: string;
  fixedColumn?: { value: string; label: string };
  onChange: (columns: Column[] | null) => void;
};

export function ColumnSettings<Column extends string>({
  columns,
  options,
  defaultColumns,
  defaultDescription = "Используются колонки по умолчанию.",
  fixedColumn,
  onChange,
}: Props<Column>) {
  const available = options.filter((option) => !columns?.includes(option.value));
  const move = (index: number, offset: number) => {
    if (!columns) return;
    const target = index + offset;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="space-y-3 rounded-lg border border-zinc-700 p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-200">Колонки результатов</legend>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          className="size-4 accent-sky-500"
          checked={columns !== null}
          onChange={(event) => onChange(event.target.checked ? [...defaultColumns] : null)}
        />
        Настроить колонки и их порядок
      </label>
      {columns === null ? (
        <p className="text-xs text-zinc-500">{defaultDescription}</p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">Порядок в списке соответствует порядку слева направо.</p>
          <ol aria-label="Порядок колонок результатов" className="space-y-2">
            {fixedColumn && <li className="flex min-h-10 items-center gap-3 rounded-md bg-zinc-950/50 px-3 py-2 text-sm text-zinc-400">
              <span className="w-5 shrink-0 text-right tabular-nums">1.</span>
              <span className="flex-1">{fixedColumn.label}</span>
              <span className="text-xs">Всегда первая</span>
            </li>}
            {columns.map((column, index) => {
              const label = options.find((option) => option.value === column)?.label ?? column;
              return (
                <li key={column} className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2">
                  <span className="w-5 shrink-0 text-right text-sm text-zinc-500 tabular-nums">{index + (fixedColumn ? 2 : 1)}.</span>
                  <span className="min-w-0 flex-1 text-sm text-zinc-200">{label}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button icon={<ArrowUp size={16} />} iconOnly ariaLabel={`Поднять колонку «${label}»`} tooltip="Переместить влево" disabled={index === 0} onClick={() => move(index, -1)} />
                    <Button icon={<ArrowDown size={16} />} iconOnly ariaLabel={`Опустить колонку «${label}»`} tooltip="Переместить вправо" disabled={index === columns.length - 1} onClick={() => move(index, 1)} />
                    <Button icon={<X size={16} />} iconOnly ariaLabel={`Убрать колонку «${label}»`} tooltip="Убрать колонку" onClick={() => onChange(columns.filter((item) => item !== column))} />
                  </div>
                </li>
              );
            })}
          </ol>
          <Selector
            label="Добавить колонку"
            value=""
            disabled={!available.length}
            disabledPlaceholder="Все колонки добавлены"
            options={[{ value: "", label: "Выберите колонку", disabled: true }, ...available]}
            onChange={(event) => {
              const option = available.find((item) => item.value === event.target.value);
              if (option) onChange([...columns, option.value]);
            }}
          />
        </>
      )}
    </fieldset>
  );
}
