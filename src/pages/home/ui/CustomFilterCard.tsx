import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { AppSettings } from "src/entities/settings";
import type { CustomIssueFilter } from "src/entities/issue-filter";
import { customFilterColumns, customFilterUrl, filterColumnOptions } from "../model/customFilters";
import { ISSUE_TABLE_COLUMN_OPTIONS } from "src/entities/redmine";
import { getCurrentUser } from "src/entities/redmine";
import { useCustomFilterIssues } from "../model/useCustomFilterIssues";
import { Button, buttonClassName } from "src/shared/ui/Button";
import { IssueTable } from "src/widgets/issue-table";

type Props = {
  filter: CustomIssueFilter;
  settings: AppSettings;
  revision: number;
  configured: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPageSizeChange: (size: number) => Promise<void>;
  onLoadingChange: (id: string, loading: boolean) => void;
};

export function CustomFilterCard({ filter, settings, revision, configured, busy, onEdit, onDelete, onPageSizeChange, onLoadingChange }: Props) {
  const list = useCustomFilterIssues(filter, settings, revision, configured);
  const columnLabels = Object.fromEntries(
    filterColumnOptions(settings, filter.conditions.columns)
      .filter((option) => option.value.startsWith("cf_"))
      .map(({ value, label }) => [value, label]),
  );
  const [pageSize, setPageSize] = useState(String(filter.pageSize));
  const connection = JSON.stringify([settings.redmineUrl, settings.apiKey]);
  const [identity, setIdentity] = useState<{ connection: string; id: number } | null>(null);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    void getCurrentUser().then((user) => {
      if (active) setIdentity({ connection, id: user.id });
    }, () => { if (active) setIdentity(null); });
    return () => { active = false; };
  }, [connection, configured, revision]);
  const pages = Math.max(1, Math.ceil(list.totalCount / filter.pageSize));
  useEffect(() => { setPageSize(String(filter.pageSize)); }, [filter.pageSize]);
  useEffect(() => {
    onLoadingChange(filter.id, list.loading);
    return () => onLoadingChange(filter.id, false);
  }, [filter.id, list.loading, onLoadingChange]);

  const applyPageSize = async () => {
    const parsed = Number(pageSize);
    const next = pageSize.trim() && Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.trunc(parsed))) : filter.pageSize;
    setPageSize(String(next));
    if (next === filter.pageSize || busy) return;
    try { await onPageSizeChange(next); }
    catch { setPageSize(String(filter.pageSize)); }
  };

  let url: string | null = null;
  try { if (settings.redmineUrl && identity?.connection === connection) url = customFilterUrl(filter.projectIdentifier, filter.conditions, settings, identity.id); }
  catch { /* Invalid saved conditions are reported in the card and can be edited. */ }

  return (
    <IssueTable
      title={filter.name}
      description={filter.description}
      redmineUrl={settings.redmineUrl}
      configured={configured}
      compact={filter.width !== "1"}
      columns={customFilterColumns(filter.conditions, settings)}
      columnLabels={columnLabels}
      groupBy={ISSUE_TABLE_COLUMN_OPTIONS.find((option) => option.redmineColumn === filter.conditions.groupBy)?.value}
      {...list}
      actions={
        <div className="flex shrink-0 gap-1">
          <Button icon={<Pencil size={16} />} iconOnly ariaLabel={`Редактировать фильтр «${filter.name}»`} ariaHasPopup="dialog" tooltip="Редактировать фильтр" disabled={busy || !configured} onClick={onEdit} />
          {url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Открыть фильтр «${filter.name}» в Redmine`} title="Перейти в Redmine" className={buttonClassName({ iconOnly: true })}><ExternalLink size={16} /></a>
            : <Button icon={<ExternalLink size={16} />} iconOnly ariaLabel="Перейти в Redmine" disabled />}
          <Button icon={<Trash2 size={16} />} iconOnly variant="danger" fill="outline" ariaLabel={`Удалить фильтр «${filter.name}»`} ariaHasPopup="dialog" tooltip="Удалить фильтр" disabled={busy} onClick={onDelete} />
        </div>
      }
      footer={
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-zinc-800 px-3 py-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Строк на странице
            <input type="number" min={1} max={100} step={1} value={pageSize} disabled={busy} aria-label={`Строк на странице фильтра «${filter.name}»`} onChange={(event) => setPageSize(event.target.value)} onBlur={() => { void applyPageSize(); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} className="h-8 w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none focus:border-sky-400 disabled:opacity-60" />
          </label>
          <div className="flex items-center gap-2">
            <span role="status" className="text-xs text-zinc-400 tabular-nums">{list.loading ? "Загрузка…" : list.error ? "Ошибка загрузки" : `${list.page + 1} / ${pages}`}</span>
            <Button icon={<ChevronLeft size={16} />} iconOnly ariaLabel={`Предыдущая страница фильтра «${filter.name}»`} tooltip="Назад" disabled={!configured || list.loading || list.page === 0} onClick={() => list.setPage(list.page - 1)} />
            <Button icon={<ChevronRight size={16} />} iconOnly ariaLabel={`Следующая страница фильтра «${filter.name}»`} tooltip="Вперёд" disabled={!configured || list.loading || Boolean(list.error) || list.page + 1 >= pages} onClick={() => list.setPage(list.page + 1)} />
          </div>
        </div>
      }
    />
  );
}
