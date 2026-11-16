import { saveAppData } from "src/entities/app-data";
import { useCallback, useRef, useState } from "react";
import { Plus, RefreshCw, Settings } from "lucide-react";
import type { CustomIssueFilter } from "src/entities/issue-filter";
import { useAppDispatch, useAppSelector } from "src/shared/lib/store";
import { setCustomFilters } from "src/entities/app-data";
import { useToast } from "src/features/show-toast";
import { Button } from "src/shared/ui/Button";
import { CustomFilterDialog } from "./CustomFilterDialog";
import { CustomFilterCard } from "./CustomFilterCard";
import { FilterLayoutDialog } from "./FilterLayoutDialog";
import { DeleteFilterDialog } from "./DeleteFilterDialog";

const widthClasses = { "1": "col-span-6", "1/2": "col-span-3", "1/3": "col-span-2" } as const;

export function CustomFilters() {
  const data = useAppSelector((state) => state.appData.data);
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const [editing, setEditing] = useState<CustomIssueFilter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [deleting, setDeleting] = useState<CustomIssueFilter | null>(null);
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());
  const configured = Boolean(data?.settings.redmineUrl && data.settings.apiKey);
  const filters = data?.customFilters ?? [];
  const loading = loadingIds.size > 0;
  const modalOpen = dialogOpen || layoutOpen || deleting !== null;
  const onLoadingChange = useCallback((id: string, isLoading: boolean) => {
    setLoadingIds((current) => {
      if (current.has(id) === isLoading) return current;
      const next = new Set(current);
      if (isLoading) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const persist = async (next: CustomIssueFilter[]) => {
    if (!data) throw new Error("Данные приложения ещё не загружены");
    if (savingRef.current) throw new Error("Дождитесь сохранения настроек");
    savingRef.current = true;
    setBusy(true);
    try {
      await saveAppData({ ...data, customFilters: next });
      dispatch(setCustomFilters(next));
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  };

  const save = async (filter: CustomIssueFilter) => {
    const exists = filters.some((item) => item.id === filter.id);
    await persist(exists ? filters.map((item) => item.id === filter.id ? filter : item) : [...filters, filter]);
    setDialogOpen(false);
    notify(exists ? "Фильтр обновлён" : "Фильтр создан");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Button variant="primary" icon={<Plus size={16} />} ariaHasPopup="dialog" disabled={!configured || busy} onClick={() => { setEditing(null); setDialogOpen(true); }}>Добавить фильтр</Button>
        <div className="ml-auto flex gap-2">
          <Button icon={<RefreshCw size={16} />} disabled={!configured || loading || !filters.length} onClick={() => setRevision((current) => current + 1)}>Обновить данные</Button>
          <Button icon={<Settings size={16} />} iconOnly ariaLabel="Настройки отображения страницы" ariaHasPopup="dialog" tooltip="Порядок и ширина фильтров" disabled={busy || !filters.length} onClick={() => setLayoutOpen(true)} />
        </div>
      </div>
      {!configured && <p className="mb-4 shrink-0 rounded-lg border border-sky-800 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">Для загрузки задач и настройки фильтров заполните подключение в «Настройки → Redmine».</p>}
      <div className="min-h-0 flex-1 overflow-auto">
        {!filters.length && <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-sm text-zinc-400">Пока нет фильтров. Нажмите «Добавить фильтр», чтобы создать первую таблицу задач.</div>}
        <div className="grid grid-cols-6 items-start gap-4">
          {data && filters.map((filter) => (
            <div key={filter.id} className={`min-w-0 ${widthClasses[filter.width]}`}>
              <CustomFilterCard
                filter={filter}
                settings={data.settings}
                configured={configured}
                revision={revision}
                busy={busy || modalOpen}
                onLoadingChange={onLoadingChange}
                onEdit={() => { setEditing(filter); setDialogOpen(true); }}
                onDelete={() => setDeleting(filter)}
                onPageSizeChange={async (size) => {
                  try { await persist(filters.map((item) => item.id === filter.id ? { ...item, pageSize: size } : item)); }
                  catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); throw error; }
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {dialogOpen && data && <CustomFilterDialog key={editing?.id ?? "new"} filter={editing} settings={data.settings} onSave={save} onClose={() => setDialogOpen(false)} />}
      {layoutOpen && <FilterLayoutDialog filters={filters} onSave={async (next) => { await persist(next); notify("Порядок и ширина фильтров сохранены"); }} onClose={() => setLayoutOpen(false)} />}
      {deleting && <DeleteFilterDialog name={deleting.name} onDelete={async () => { await persist(filters.filter((filter) => filter.id !== deleting.id)); notify("Фильтр удалён"); }} onClose={() => setDeleting(null)} />}
    </div>
  );
}
