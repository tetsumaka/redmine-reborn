import { saveAppData } from "src/entities/app-data";
import type { AppSettings, IssueFilterSettings } from "src/entities/settings";
import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { ACTIVITY_ID_PLACEHOLDERS } from "src/shared/config/constants";
import { useToast } from "src/features/show-toast";
import { Button } from "src/shared/ui/Button";
import { NumberInput } from "src/shared/ui/NumberInput";
import { TextInput } from "src/shared/ui/TextInput";
import { ACTIVITIES } from "src/shared/config/domain";
import { setSettings } from "src/entities/app-data";
import { useAppDispatch, useAppSelector } from "src/shared/lib/store";

export function RedmineSettingsPage() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const { notify } = useToast();
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const draft = settingsDraft ?? data?.settings;
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettingsDraft((current) => {
      const settings = current ?? data?.settings;
      return settings ? { ...settings, [key]: value } : null;
    });
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
      await saveAppData({ ...data, settings });
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
                placeholder="https:"
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
            <p className="col-span-2 text-xs leading-relaxed text-zinc-400">
              Сертификату Redmine должен доверять браузер. API-ключ хранится в этом браузере
              и передаётся Redmine в параметре key; адрес запроса может попасть в журналы сервера.
              Текущий пользователь определяется автоматически по API-ключу.
            </p>
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
