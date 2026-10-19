import type {
  AppSettings,
  IssueFilterSettings,
  RedmineIssueStatus,
} from "src/shared/types";
import { useEffect, useState, type FormEvent } from "react";
import { FolderOpen, RefreshCw, Save } from "lucide-react";
import { ACTIVITY_ID_PLACEHOLDERS } from "src/renderer/shared/config/constants";
import { useToast } from "src/renderer/features/show-toast";
import { Button } from "src/renderer/shared/ui/Button";
import { NumberInput } from "src/renderer/shared/ui/NumberInput";
import { TextInput } from "src/renderer/shared/ui/TextInput";
import { Selector } from "src/renderer/shared/ui/Selector";
import { ACTIVITIES } from "src/shared/constants";
import { api } from "src/renderer/shared/api/api";
import { setSettings } from "src/renderer/entities/app-data";
import {
  useAppDispatch,
  useAppSelector,
} from "src/renderer/app/providers/store/hooks";

const statusFields: Array<{
  key: "codeReviewStatusId" | "resolvedStatusId" | "feedbackStatusId";
  label: string;
  name: string;
}> = [
  { key: "codeReviewStatusId", label: "Статус для кодревью", name: "codereview" },
  { key: "resolvedStatusId", label: "Статус для проверки QA", name: "resolved" },
  { key: "feedbackStatusId", label: "Статус для feedback", name: "feedback" },
];

export function RedmineSettingsPage() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const { notify } = useToast();
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const draft = settingsDraft ?? data?.settings;
  const [saving, setSaving] = useState(false);
  const savedSettings = data?.settings;
  const canLoadStatuses = Boolean(
    savedSettings?.redmineUrl && savedSettings.apiKey && savedSettings.userId && savedSettings.certificatePath,
  );
  const [statuses, setStatuses] = useState<RedmineIssueStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusRevision, setStatusRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setStatuses([]);
    setStatusError(null);
    setLoadingStatuses(canLoadStatuses);
    if (canLoadStatuses) {
      void api().getIssueStatuses().then(
        (loaded) => {
          if (active) {
            setStatuses(loaded);
            setLoadingStatuses(false);
          }
        },
        (error: unknown) => {
          if (active) {
            setStatusError(error instanceof Error ? error.message : String(error));
            setLoadingStatuses(false);
          }
        },
      );
    }
    return () => {
      active = false;
    };
  }, [savedSettings, canLoadStatuses, statusRevision]);

  const update = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettingsDraft((current) => {
      const settings = current ?? data?.settings;
      return settings ? { ...settings, [key]: value } : null;
    });
  };

  const chooseCertificate = async () => {
    try {
      const path = await api().chooseCertificate();
      if (path) update("certificatePath", path);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  };

  const updateIssueFilter = (key: keyof IssueFilterSettings, value: string) => {
    if (!draft) return;
    update("issueFilters", { ...draft.issueFilters, [key]: value });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !draft || saving) return;
    setSaving(true);
    try {
      const settings: AppSettings = {
        ...draft,
        redmineUrl: draft.redmineUrl.trim(),
        apiKey: draft.apiKey.trim(),
      };
      await api().save({ ...data, settings });
      dispatch(setSettings(settings));
      notify("Настройки сохранены");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null;

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextInput
                label="URL Redmine"
                type="url"
                placeholder="https://redmine.company.ru"
                required
                value={draft.redmineUrl}
                onChange={(event) => update("redmineUrl", event.target.value)}
              />
            </div>
            <div className="col-span-2">
              <TextInput
                label="API-ключ"
                type="password"
                autoComplete="off"
                required
                value={draft.apiKey}
                onChange={(event) => update("apiKey", event.target.value)}
              />
            </div>
            <div className="col-span-2">
              <NumberInput
                label="ID пользователя Redmine"
                min="1"
                required
                value={draft.userId}
                onChange={(event) => update("userId", event.target.value)}
              />
            </div>
            <div className="col-span-2 grid grid-cols-[1fr_auto] items-end gap-2">
              <TextInput
                label="CA-сертификат (PEM, CRT или CER)"
                readOnly
                required
                value={draft.certificatePath}
              />
              <Button icon={<FolderOpen size={16} />} onClick={chooseCertificate}>
                Выбрать
              </Button>
            </div>
          </div>
          <h3 className="mt-6 text-sm font-extrabold text-zinc-100">
            ID деятельностей в Redmine
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {ACTIVITIES.map((activity) => (
              <NumberInput
                key={activity}
                label={activity}
                min="1"
                placeholder={String(ACTIVITY_ID_PLACEHOLDERS[activity] ?? "")}
                value={draft.activityIds[activity] ?? ""}
                onChange={(event) => {
                  const activityIds = { ...draft.activityIds };
                  if (event.target.value)
                    activityIds[activity] = Number(event.target.value);
                  else delete activityIds[activity];
                  update("activityIds", activityIds);
                }}
              />
            ))}
          </div>
          <fieldset className="mt-6 border-t border-zinc-800 pt-5">
            <legend className="text-sm font-extrabold text-zinc-100">Фильтры главной страницы</legend>
            <p className="mb-4 text-xs leading-relaxed text-zinc-400">
              Укажите ID пользовательских полей «Кодревьювер» и «QA». В Redmine у этих полей должна быть включена настройка «Использовать в качестве фильтра».
              ID виден в ссылке после применения фильтра: например, cf_12 — поле с ID 12.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="ID поля «Кодревьювер»"
                min="1"
                value={draft.issueFilters.codeReviewerFieldId}
                onChange={(event) => updateIssueFilter("codeReviewerFieldId", event.target.value)}
              />
              <NumberInput
                label="ID поля «QA»"
                min="1"
                value={draft.issueFilters.qaFieldId}
                onChange={(event) => updateIssueFilter("qaFieldId", event.target.value)}
              />
            </div>
            <div className="mb-3 mt-5 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-300">Статусы задач</span>
              <Button
                icon={<RefreshCw size={16} />}
                disabled={!canLoadStatuses || loadingStatuses}
                onClick={() => setStatusRevision((current) => current + 1)}
              >
                {loadingStatuses ? "Загрузка…" : "Обновить статусы"}
              </Button>
            </div>
            {!canLoadStatuses && <p className="mb-3 text-xs text-zinc-400">Сохраните подключение к Redmine, чтобы загрузить список статусов.</p>}
            {statusError && <p role="alert" className="mb-3 text-sm text-red-300">{statusError}</p>}
            <div className="grid grid-cols-3 gap-3">
              {statusFields.map(({ key, label, name }) => (
                <Selector
                  key={key}
                  label={label}
                  value={draft.issueFilters[key]}
                  options={[
                    { value: "", label: `По названию ${name}` },
                    ...statuses.map((status) => ({ value: String(status.id), label: status.name })),
                    ...(draft.issueFilters[key] && !statuses.some((status) => String(status.id) === draft.issueFilters[key])
                      ? [{ value: draft.issueFilters[key], label: `Статус #${draft.issueFilters[key]}` }] : []),
                  ]}
                  onChange={(event) => updateIssueFilter(key, event.target.value)}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="mt-4 flex shrink-0 justify-end border-t border-zinc-800 pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
          icon={<Save size={16} />}
        >
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>
    </form>
  );
}
