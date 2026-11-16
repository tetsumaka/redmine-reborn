import { getProjects, getIssuePriorities, getIssueStatuses, getCurrentUser } from "src/entities/redmine";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { RefreshCw, Save, X } from "lucide-react";
import type { AppSettings } from "src/entities/settings";
import type { CustomIssueFilter, CustomIssueFilterConditions } from "src/entities/issue-filter";
import type { RedmineIssueStatus, RedmineNamedItem, RedmineProject } from "src/entities/redmine";
import { Button } from "src/shared/ui/Button";
import { ModalWindow } from "src/shared/ui/ModalWindow";
import { Selector } from "src/shared/ui/Selector";
import { TextInput } from "src/shared/ui/TextInput";
import { NumberInput } from "src/shared/ui/NumberInput";
import { ColumnSettings } from "src/shared/ui/ColumnSettings";
import { customFilterUrl, restoreFilterConditions, issueGroupingOptions, issueSortOptions, filterColumnOptions, defaultIssueColumns, issueFilterPresets, presetStatus, presetConditions } from "../model/customFilters";
import { useProjectFilterOptions } from "../model/useProjectFilterOptions";

type Props = {
  filter: CustomIssueFilter | null;
  settings: AppSettings;
  onSave: (filter: CustomIssueFilter) => Promise<void>;
  onClose: () => void;
};

type Option = { value: string; label: string; disabled?: boolean };

function keepSelected(options: Option[], value: string, label: string): Option[] {
  return value && !options.some((option) => option.value === value)
    ? [...options, { value, label: `${label} #${value} (нет в списке)`, disabled: true }] : options;
}

function UserCondition({ label, value, onChange, optional = false, unassigned = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  unassigned?: boolean;
}) {
  const options: Option[] = [
    { value: "", label: "Любой" }, { value: "me", label: "Я" },
    ...(optional ? [{ value: unassigned ? "unassigned" : "none", label: unassigned ? "Не назначено" : "Не указан" }, { value: "any", label: unassigned ? "Назначено" : "Указан" }] : []),
  ];
  const [byId, setById] = useState(() => Boolean(value && !options.some((option) => option.value === value)));
  return (
    <div className="space-y-2">
      <Selector label={label} value={byId ? "byId" : value} options={[...options, { value: "byId", label: "По ID пользователя" }]} onChange={(event) => {
        setById(event.target.value === "byId");
        onChange(event.target.value === "byId" ? "" : event.target.value);
      }} />
      {byId && <NumberInput label={`ID пользователя — ${label}`} min="1" required value={value} placeholder="Например, 123" onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function OptionsStatus({ label, options }: {
  label: string;
  options: { loading: boolean; error: string | null; refresh: () => void };
}) {
  return <>
    {options.loading && <p role="status" className="text-xs text-zinc-400">Загрузка {label}…</p>}
    {options.error && <div className="flex items-center justify-between gap-3">
      <p role="alert" className="text-sm text-red-300">Не удалось загрузить {label}: {options.error}</p>
      <Button icon={<RefreshCw size={16} />} onClick={options.refresh}>Повторить</Button>
    </div>}
  </>;
}

export function CustomFilterDialog({ filter, settings, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(filter?.name ?? "");
  const [description, setDescription] = useState(filter?.description ?? "");
  const [projectId, setProjectId] = useState(filter?.projectId ? String(filter.projectId) : "");
  const [conditions, setConditions] = useState<CustomIssueFilterConditions>(() => filter
    ? restoreFilterConditions(filter.conditions)
    : { ...restoreFilterConditions(), columns: defaultIssueColumns(settings) });
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presetGeneration, setPresetGeneration] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [statuses, setStatuses] = useState<RedmineIssueStatus[]>([]);
  const [priorities, setPriorities] = useState<RedmineNamedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const project = projects.find((item) => String(item.id) === projectId);
  const projectPlaceholder = !projectId ? "Выберите проект для выбора версии" : !project ? loading ? "Загрузка проекта…" : "Проект недоступен" : undefined;
  const optionsEnabled = !loading && !loadError && (!projectId || Boolean(project));
  const versions = useProjectFilterOptions(project?.id ?? null, settings, "getProjectVersions", optionsEnabled);
  const categories = useProjectFilterOptions(project?.id ?? null, settings, "getProjectCategories", optionsEnabled);
  const trackers = [...new Map((project ? project.trackers : projects.flatMap((item) => item.trackers)).map((item) => [item.id, item])).values()];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setCurrentUserId(null);
    void Promise.all([getProjects(), getIssueStatuses(), getIssuePriorities(), getCurrentUser()]).then(
      ([loadedProjects, loadedStatuses, loadedPriorities, user]) => {
        if (!active) return;
        setProjects(loadedProjects);
        setStatuses(loadedStatuses);
        setPriorities(loadedPriorities);
        setCurrentUserId(user.id);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active) return;
        setLoadError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [revision, settings.redmineUrl, settings.apiKey]);

  const update = <Key extends keyof CustomIssueFilterConditions>(key: Key, value: CustomIssueFilterConditions[Key]) => {
    setConditions((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (id: string) => {
    setError(null);
    try {
      const preset = issueFilterPresets.find((item) => item.id === id);
      const next = preset ? presetConditions(preset, statuses, settings) : { ...restoreFilterConditions(), columns: defaultIssueColumns(settings) };
      setSelectedPreset(id);
      setName(preset?.name ?? "");
      setDescription(preset?.description ?? "");
      setConditions(next);
      setPresetGeneration((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || loading || loadError || currentUserId === null) return;
    setError(null);
    if (!name.trim()) { setError("Введите название фильтра"); return; }
    if (projectId && !project) { setError("Выберите доступный проект или все проекты"); return; }
    setSaving(true);
    try {
      await onSave({
        id: filter?.id ?? crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        width: filter?.width ?? "1",
        pageSize: filter?.pageSize ?? 10,
        projectId: project?.id ?? null,
        projectName: project?.name ?? "Все проекты",
        projectIdentifier: project?.identifier ?? "",
        conditions: { ...conditions, subject: conditions.subject.trim(), parentIssueId: conditions.parentIssueId.trim() },
        url: customFilterUrl(project?.identifier ?? "", conditions, settings, currentUserId),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWindow
      ref={dialogRef}
      ariaLabel={filter ? "Редактировать фильтр" : "Создать фильтр"}
      onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-extrabold">{filter ? "Редактировать фильтр" : "Создать фильтр"}</h2>
          <Button icon={<X size={16} />} iconOnly ariaLabel="Закрыть диалог" onClick={onClose} disabled={saving} />
        </div>
        <div className="p-6">
          {loading && <p role="status" className="mb-4 text-sm text-zinc-400">Загрузка проектов и параметров…</p>}
          {loadError && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p role="alert" className="text-sm text-red-300">{loadError}</p>
              <Button icon={<RefreshCw size={16} />} onClick={() => setRevision((value) => value + 1)}>Повторить</Button>
            </div>
          )}
          <fieldset disabled={loading || saving || Boolean(loadError)} className="space-y-4 disabled:opacity-60">
            {!filter && <div className="space-y-2 rounded-lg border border-sky-800/60 bg-sky-950/20 p-3">
              <Selector label="Преднастроенный фильтр" value={selectedPreset} options={[
                { value: "", label: "Без преднастройки" },
                ...issueFilterPresets.map((preset) => {
                  const available = preset.statusName === null || Boolean(presetStatus(preset, statuses));
                  return { value: preset.id, label: available ? preset.name : `${preset.name} — статус ${preset.statusName} недоступен`, disabled: !available };
                }),
              ]} onChange={(event) => applyPreset(event.target.value)} />
              <p className="text-xs leading-relaxed text-zinc-400">Заполнит название, описание, условия и колонки. Все поля можно изменить перед сохранением.</p>
            </div>}
            <TextInput label="Название фильтра" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, задачи команды на проверке" />
            <p className="-mt-2 text-xs text-zinc-500">Название используется для отображения в приложении.</p>
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-300">
              <span>Описание</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={1} placeholder="Краткое описание фильтра" className="h-8 min-h-8 resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30" />
            </label>
            <Selector
              label="Проект"
              value={projectId}
              options={[
                { value: "", label: "Все проекты" },
                ...projects.map((item) => ({ value: String(item.id), label: item.name })),
                ...(filter?.projectId && projectId === String(filter.projectId) && !project && !loading
                  ? [{ value: projectId, label: `${filter.projectName} (недоступен)`, disabled: true }] : []),
              ]}
              onChange={(event) => {
                setProjectId(event.target.value);
                setConditions((current) => ({ ...current, fixedVersionId: "", categoryId: "", categoryProjectId: "" }));
              }}
            />
            {!loading && !loadError && !projects.length && <p className="text-sm text-zinc-400">Нет доступных проектов.</p>}
            <div className="grid grid-cols-2 gap-4">
              <Selector label="Статус" value={conditions.statusId} options={keepSelected([
                { value: "o", label: "Открытые" }, { value: "c", label: "Закрытые" }, { value: "*", label: "Любой" },
                ...statuses.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.statusId, "Статус")} onChange={(event) => update("statusId", event.target.value)} />
              <Selector label="Трекер" value={conditions.trackerId} options={keepSelected([
                { value: "", label: "Любой" }, ...trackers.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.trackerId, "Трекер")} onChange={(event) => update("trackerId", event.target.value)} />
              <Selector label="Приоритет" value={conditions.priorityId} options={keepSelected([
                { value: "", label: "Любой" }, ...priorities.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.priorityId, "Приоритет")} onChange={(event) => update("priorityId", event.target.value)} />
              <UserCondition key={`author-${presetGeneration}`} label="Автор" value={conditions.authorId} onChange={(value) => update("authorId", value)} />
              <UserCondition key={`assignee-${presetGeneration}`} label="Назначено" value={conditions.assignee} optional unassigned onChange={(value) => update("assignee", value)} />
              <div className="space-y-2">
                <Selector label="Категория" value={conditions.categoryId} disabled={!project || categories.loading} disabledPlaceholder={!project ? "Выберите проект для выбора категории" : categories.loading ? "Загрузка категорий…" : undefined} options={keepSelected([
                  { value: "", label: "Любая" }, { value: "none", label: "Без категории" }, { value: "any", label: "Категория указана" },
                  ...categories.items.map((item) => ({ value: String(item.id), label: item.name })),
                ], conditions.categoryId, "Категория")} onChange={(event) => {
                  const value = event.target.value;
                  const categoryProject = project?.id ?? categories.items.find((item) => String(item.id) === value)?.projectId;
                  setConditions((current) => ({ ...current, categoryId: value, categoryProjectId: categoryProject ? String(categoryProject) : "" }));
                }} />
                <OptionsStatus label="категорий" options={categories} />
                {project && !categories.loading && !categories.error && !categories.items.length && <p className="text-xs text-zinc-400">В проекте нет доступных категорий.</p>}
              </div>
              <UserCondition key={`qa-${presetGeneration}`} label="Quality Assurance" value={conditions.qaId} optional onChange={(value) => update("qaId", value)} />
              <UserCondition key={`reviewer-${presetGeneration}`} label="Code Reviewer" value={conditions.codeReviewerId} optional onChange={(value) => update("codeReviewerId", value)} />
            </div>
            <div className="space-y-2">
              <Selector label="Версия" value={conditions.fixedVersionId} disabled={!project || versions.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected([
                { value: "", label: "Не учитывать версию" },
                { value: "none", label: "Без версии" },
                { value: "any", label: "Версия указана" },
                ...versions.items.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.fixedVersionId, "Версия")} onChange={(event) => update("fixedVersionId", event.target.value)} />
              <OptionsStatus label="версий проекта" options={versions} />
              {project && !versions.loading && !versions.error && !versions.items.length && <p className="text-xs text-zinc-400">В проекте нет доступных версий.</p>}
            </div>
            <TextInput label="Родительская задача" value={conditions.parentIssueId} placeholder="Номер задачи, например 425851" onChange={(event) => update("parentIssueId", event.target.value)} />
            <TextInput label="Название задачи содержит" value={conditions.subject} onChange={(event) => update("subject", event.target.value)} />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" className="size-4 accent-sky-500" checked={conditions.watched} onChange={(event) => update("watched", event.target.checked)} />
              Я — наблюдатель
            </label>
            <p className="text-xs text-zinc-500">Все выбранные условия применяются одновременно.</p>
            <Selector label="Группировать результаты по" value={conditions.groupBy} options={issueGroupingOptions} onChange={(event) => update("groupBy", event.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Selector label="Сортировать по" value={conditions.sortBy} options={issueSortOptions} onChange={(event) => update("sortBy", event.target.value)} />
              <Selector label="Направление сортировки" value={conditions.sortDirection} options={[{ value: "asc", label: "По возрастанию" }, { value: "desc", label: "По убыванию" }]} onChange={(event) => update("sortDirection", event.target.value as "asc" | "desc")} />
            </div>
            <ColumnSettings
              columns={conditions.columns}
              options={filterColumnOptions(settings, conditions.columns)}
              defaultColumns={defaultIssueColumns(settings)}
              defaultDescription="По умолчанию: приоритет, название, статус, назначена, Code Reviewer, Quality Assurance и проект."
              fixedColumn={{ value: "id", label: "Задача (#)" }}
              onChange={(columns) => update("columns", columns)}
            />
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <Button onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={loading || saving || Boolean(loadError) || currentUserId === null || Boolean(projectId && !project)}>
            {saving ? "Сохранение…" : filter ? "Сохранить изменения" : "Создать фильтр"}
          </Button>
        </div>
      </form>
    </ModalWindow>
  );
}
