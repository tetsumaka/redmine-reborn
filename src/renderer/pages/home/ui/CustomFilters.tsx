import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CustomIssueFilter } from "src/shared/types";
import { useAppDispatch, useAppSelector } from "src/renderer/app/providers/store/hooks";
import { setCustomFilters } from "src/renderer/entities/app-data";
import { useToast } from "src/renderer/features/show-toast";
import { api } from "src/renderer/shared/api/api";
import { Button } from "src/renderer/shared/ui/Button";
import { Table } from "src/renderer/shared/ui/Table";
import { CustomFilterDialog } from "./CustomFilterDialog";

export function CustomFilters() {
  const data = useAppSelector((state) => state.appData.data);
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const [editing, setEditing] = useState<CustomIssueFilter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const configured = Boolean(data?.settings.redmineUrl && data.settings.apiKey && data.settings.userId && data.settings.certificatePath);
  const filters = data?.customFilters ?? [];

  const persist = async (next: CustomIssueFilter[]) => {
    if (!data) throw new Error("Данные приложения ещё не загружены");
    setBusy(true);
    try {
      await api().save({ ...data, customFilters: next });
      dispatch(setCustomFilters(next));
    } finally {
      setBusy(false);
    }
  };

  const save = async (filter: CustomIssueFilter) => {
    const exists = filters.some((item) => item.id === filter.id);
    await persist(exists ? filters.map((item) => item.id === filter.id ? filter : item) : [filter, ...filters]);
    setDialogOpen(false);
    notify(exists ? "Фильтр обновлён" : "Фильтр создан");
  };

  const remove = async (id: string) => {
    if (busy) return;
    try {
      await persist(filters.filter((filter) => filter.id !== id));
      notify("Фильтр удалён");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 justify-end">
        <Button variant="primary" icon={<Plus size={16} />} disabled={!configured || busy} onClick={() => { setEditing(null); setDialogOpen(true); }}>Создать фильтр</Button>
      </div>
      {!configured && <p className="mb-3 text-sm text-zinc-400">Для создания и редактирования фильтров заполните подключение в «Настройки → Redmine».</p>}
      <Table
        minWidth={600}
        headers={[{ key: "project", component: "Проект" }, { key: "name", component: "Название фильтра" }, { key: "actions", component: "Действия" }]}
        rows={filters.map((filter) => ({
          key: filter.id,
          component: (
            <tr className="transition hover:bg-zinc-800/70">
              <td className="min-w-[240px] px-4 py-3 text-zinc-300">{filter.projectName}</td>
              <td className="w-full px-4 py-3 text-sky-300">
                <a href={filter.url} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">{filter.name}</a>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button icon={<Pencil size={16} />} iconOnly ariaLabel={`Редактировать фильтр «${filter.name}»`} tooltip="Редактировать фильтр" disabled={busy || !configured} onClick={() => { setEditing(filter); setDialogOpen(true); }} />
                  <Button icon={<Trash2 size={16} />} iconOnly variant="danger" fill="outline" ariaLabel={`Удалить фильтр «${filter.name}»`} tooltip="Удалить фильтр" disabled={busy} onClick={() => { void remove(filter.id); }} />
                </div>
              </td>
            </tr>
          ),
        }))}
        emptyState={<p className="px-5 py-8 text-sm text-zinc-400">Пока нет пользовательских фильтров. Создайте первый фильтр.</p>}
      />
      {dialogOpen && data && <CustomFilterDialog key={editing?.id ?? "new"} filter={editing} settings={data.settings} onSave={save} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
