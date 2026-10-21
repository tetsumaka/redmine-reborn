import { useEffect, useRef, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import type { IssueTableColumn } from "src/shared/types";
import { ISSUE_TABLE_COLUMN_OPTIONS } from "src/shared/issueTableColumns";
import { Button } from "src/renderer/shared/ui/Button";
import { ColumnSettings } from "src/renderer/shared/ui/ColumnSettings";
import { ModalWindow } from "src/renderer/shared/ui/ModalWindow";

type Props = {
  title: string;
  columns: IssueTableColumn[] | null;
  defaultColumns: readonly IssueTableColumn[];
  onSave: (columns: IssueTableColumn[] | null) => Promise<void>;
  onClose: () => void;
};

export function IssueTableColumnsDialog({ title, columns, defaultColumns, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => columns ? [...columns] : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWindow
      ref={dialogRef}
      ariaLabel={`Колонки таблицы «${title}»`}
      onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold">Колонки таблицы</h2>
            <p className="mt-1 text-sm text-zinc-400">{title}</p>
          </div>
          <Button icon={<X size={16} />} iconOnly ariaLabel="Закрыть диалог" onClick={onClose} disabled={saving} />
        </div>
        <fieldset disabled={saving} className="p-6 disabled:opacity-60">
          <ColumnSettings
            columns={draft}
            options={ISSUE_TABLE_COLUMN_OPTIONS}
            defaultColumns={defaultColumns}
            defaultDescription="Используется стандартный набор колонок этой таблицы."
            fixedColumn={{ value: "id", label: "Задача (#)" }}
            onChange={setDraft}
          />
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <Button onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </ModalWindow>
  );
}
