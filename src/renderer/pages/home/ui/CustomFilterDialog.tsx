import { useEffect, useRef, useState, type FormEvent } from "react";
import { RefreshCw, Save, X } from "lucide-react";
import type { AppSettings, CustomIssueFilter, CustomIssueFilterConditions, RedmineIssueStatus, RedmineNamedItem, RedmineProject } from "src/shared/types";
import { api } from "src/renderer/shared/api/api";
import { Button } from "src/renderer/shared/ui/Button";
import { ModalWindow } from "src/renderer/shared/ui/ModalWindow";
import { Selector } from "src/renderer/shared/ui/Selector";
import { TextInput } from "src/renderer/shared/ui/TextInput";
import { customFilterUrl, restoreFilterConditions, issueGroupingOptions } from "../model/customFilters";
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
  const [projectId, setProjectId] = useState(filter ? String(filter.projectId) : "");
  const [conditions, setConditions] = useState<CustomIssueFilterConditions>(() => restoreFilterConditions(filter?.conditions));
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [statuses, setStatuses] = useState<RedmineIssueStatus[]>([]);
  const [priorities, setPriorities] = useState<RedmineNamedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const project = projects.find((item) => String(item.id) === projectId);
  const projectPlaceholder = !projectId ? "Не выбран проект" : !project ? loading ? "Загрузка проекта…" : "Проект недоступен" : undefined;
  const versions = useProjectFilterOptions(project?.id ?? null, settings, "getProjectVersions");
  const users = useProjectFilterOptions(project?.id ?? null, settings, "getProjectUsers");
  const categories = useProjectFilterOptions(project?.id ?? null, settings, "getProjectCategories");
  const userOptions: Option[] = [
    { value: "", label: "Любой" }, { value: "me", label: "Я" },
    ...users.items.map((item) => ({ value: String(item.id), label: item.name })),
  ];
  const roleOptions: Option[] = [
    ...userOptions, { value: "none", label: "Не указан" }, { value: "any", label: "Указан" },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void Promise.all([api().getProjects(), api().getIssueStatuses(), api().getIssuePriorities()]).then(
      ([loadedProjects, loadedStatuses, loadedPriorities]) => {
        if (!active) return;
        setProjects(loadedProjects);
        setStatuses(loadedStatuses);
        setPriorities(loadedPriorities);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active) return;
        setLoadError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [revision, settings.redmineUrl, settings.apiKey, settings.userId, settings.certificatePath]);

  const update = <Key extends keyof CustomIssueFilterConditions>(key: Key, value: CustomIssueFilterConditions[Key]) => {
    setConditions((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || loading || loadError) return;
    setError(null);
    if (!name.trim()) { setError("Введите название фильтра"); return; }
    if (!project) { setError("Выберите доступный проект"); return; }
    setSaving(true);
    try {
      await onSave({
        id: filter?.id ?? crypto.randomUUID(),
        name: name.trim(),
        projectId: project.id,
        projectName: project.name,
        projectIdentifier: project.identifier,
        conditions: { ...conditions, subject: conditions.subject.trim(), parentIssueId: conditions.parentIssueId.trim() },
        url: customFilterUrl(project.identifier, conditions, settings),
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
            <TextInput label="Название фильтра" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, задачи команды на проверке" />
            <p className="-mt-2 text-xs text-zinc-500">Название используется для отображения в приложении.</p>
            <Selector
              label="Проект"
              value={projectId}
              options={[
                { value: "", label: "Выберите проект", disabled: true },
                ...projects.map((item) => ({ value: String(item.id), label: item.name })),
                ...(filter && projectId === String(filter.projectId) && !project && !loading
                  ? [{ value: projectId, label: `${filter.projectName} (недоступен)`, disabled: true }] : []),
              ]}
              onChange={(event) => {
                setProjectId(event.target.value);
                setConditions((current) => ({ ...current, trackerId: "", fixedVersionId: "", categoryId: "" }));
              }}
            />
            {!loading && !loadError && !projects.length && <p className="text-sm text-zinc-400">Нет доступных проектов.</p>}
            <div className="grid grid-cols-2 gap-4">
              <Selector label="Статус" value={conditions.statusId} options={keepSelected([
                { value: "o", label: "Открытые" }, { value: "c", label: "Закрытые" }, { value: "*", label: "Любой" },
                ...statuses.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.statusId, "Статус")} onChange={(event) => update("statusId", event.target.value)} />
              <Selector label="Трекер" value={conditions.trackerId} disabled={!project} disabledPlaceholder={projectPlaceholder} options={keepSelected([
                { value: "", label: "Любой" }, ...(project?.trackers ?? []).map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.trackerId, "Трекер")} onChange={(event) => update("trackerId", event.target.value)} />
              <Selector label="Приоритет" value={conditions.priorityId} options={keepSelected([
                { value: "", label: "Любой" }, ...priorities.map((item) => ({ value: String(item.id), label: item.name })),
              ], conditions.priorityId, "Приоритет")} onChange={(event) => update("priorityId", event.target.value)} />
              <Selector label="Автор" value={conditions.authorId} disabled={!project || users.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected(userOptions, conditions.authorId, "Пользователь")} onChange={(event) => update("authorId", event.target.value)} />
              <Selector label="Назначено" value={conditions.assignee} disabled={!project || users.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected([
                ...userOptions, { value: "unassigned", label: "Не назначено" }, { value: "any", label: "Назначено" },
              ], conditions.assignee, "Пользователь")} onChange={(event) => update("assignee", event.target.value)} />
              <div className="space-y-2">
                <Selector label="Категория" value={conditions.categoryId} disabled={!project || categories.loading} disabledPlaceholder={projectPlaceholder ?? (categories.loading ? "Загрузка категорий…" : undefined)} options={keepSelected([
                  { value: "", label: "Любая" }, { value: "none", label: "Без категории" }, { value: "any", label: "Категория указана" },
                  ...categories.items.map((item) => ({ value: String(item.id), label: item.name })),
                ], conditions.categoryId, "Категория")} onChange={(event) => update("categoryId", event.target.value)} />
                <OptionsStatus label="категории проекта" options={categories} />
                {project && !categories.loading && !categories.error && !categories.items.length && <p className="text-xs text-zinc-400">В проекте нет доступных категорий.</p>}
              </div>
              <Selector label="Quality Assurance" value={conditions.qaId} disabled={!project || users.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected(roleOptions, conditions.qaId, "Пользователь")} onChange={(event) => update("qaId", event.target.value)} />
              <Selector label="Code Reviewer" value={conditions.codeReviewerId} disabled={!project || users.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected(roleOptions, conditions.codeReviewerId, "Пользователь")} onChange={(event) => update("codeReviewerId", event.target.value)} />
            </div>
            <OptionsStatus label="участников проекта" options={users} />
            <div className="space-y-2">
              <Selector label="Целевая версия" value={conditions.fixedVersionId} disabled={!project || versions.loading} disabledPlaceholder={projectPlaceholder} options={keepSelected([
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
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <Button onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={loading || saving || Boolean(loadError) || !project}>
            {saving ? "Сохранение…" : filter ? "Сохранить изменения" : "Создать фильтр"}
          </Button>
        </div>
      </form>
    </ModalWindow>
  );
}
