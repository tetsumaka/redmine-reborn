import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "src/renderer/shared/ui/Button";
import { ModalWindow } from "src/renderer/shared/ui/ModalWindow";

type Props = { name: string; onDelete: () => Promise<void>; onClose: () => void };

export function DeleteFilterDialog({ name, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
    try { await onDelete(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setSaving(false); }
  };
  return (
    <ModalWindow ref={dialogRef} ariaLabel="Удалить фильтр" onClose={onClose} onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}>
      <form onSubmit={submit}>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-extrabold">Удалить фильтр?</h2>
          <Button icon={<X size={16} />} iconOnly ariaLabel="Закрыть диалог" onClick={onClose} disabled={saving} />
        </div>
        <div className="p-6">
          <p className="break-words text-sm text-zinc-300">Фильтр «{name}» будет удалён из приложения. Задачи в Redmine сохранятся.</p>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <Button onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" variant="danger" icon={<Trash2 size={16} />} disabled={saving}>{saving ? "Удаление…" : "Удалить фильтр"}</Button>
        </div>
      </form>
    </ModalWindow>
  );
}
