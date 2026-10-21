import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Save, X } from "lucide-react";
import type { CustomIssueFilter } from "src/shared/types";
import { Button } from "src/renderer/shared/ui/Button";
import { ModalWindow } from "src/renderer/shared/ui/ModalWindow";
import { Selector } from "src/renderer/shared/ui/Selector";

type Props = {
  filters: CustomIssueFilter[];
  onSave: (filters: CustomIssueFilter[]) => Promise<void>;
  onClose: () => void;
};

export function FilterLayoutDialog({ filters, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => filters.map((filter) => ({ ...filter })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const move = (index: number, offset: number) => {
    const next = [...draft];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try { await onSave(draft); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setSaving(false); }
  };

  return (
    <ModalWindow ref={dialogRef} ariaLabel="Настройки отображения страницы" onClose={onClose} onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}>
      <form onSubmit={submit}>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-extrabold">Настройки отображения страницы</h2>
          <Button icon={<X size={16} />} iconOnly ariaLabel="Закрыть диалог" onClick={onClose} disabled={saving} />
        </div>
        <fieldset disabled={saving} className="space-y-4 p-6 disabled:opacity-60">
          <p className="text-sm text-zinc-400">Задайте порядок карточек и их ширину. Карточки располагаются слева направо; если места недостаточно, начинается новая строка.</p>
          <ol aria-label="Порядок фильтров" className="space-y-3">
            {draft.map((filter, index) => (
              <li key={filter.id} className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-800 p-3">
                <span className="text-sm text-zinc-500 tabular-nums">{index + 1}.</span>
                <span className="min-w-0 flex-1 break-words text-sm font-semibold">{filter.name}</span>
                <Selector label={`Ширина «${filter.name}»`} value={filter.width} options={[{ value: "1", label: "1 — вся строка" }, { value: "1/2", label: "1/2 — половина" }, { value: "1/3", label: "1/3 — треть" }]} onChange={(event) => setDraft((current) => current.map((item) => item.id === filter.id ? { ...item, width: event.target.value as CustomIssueFilter["width"] } : item))} />
                <div className="flex shrink-0 gap-1">
                  <Button icon={<ArrowUp size={16} />} iconOnly ariaLabel={`Поднять фильтр «${filter.name}»`} tooltip="Переместить выше" disabled={index === 0} onClick={() => move(index, -1)} />
                  <Button icon={<ArrowDown size={16} />} iconOnly ariaLabel={`Опустить фильтр «${filter.name}»`} tooltip="Переместить ниже" disabled={index === draft.length - 1} onClick={() => move(index, 1)} />
                </div>
              </li>
            ))}
          </ol>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <Button onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</Button>
        </div>
      </form>
    </ModalWindow>
  );
}
