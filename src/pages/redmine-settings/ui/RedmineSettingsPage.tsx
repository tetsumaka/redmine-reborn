import { setAppData } from "src/entities/app-data";
import { connectRedmine } from "src/features/connect-redmine";
import type { AppSettings } from "src/entities/settings";
import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { useToast } from "src/features/show-toast";
import { Button } from "src/shared/ui/Button";
import { TextInput } from "src/shared/ui/TextInput";
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !draft || saving) return;
    setSaving(true);
    try {
      const saved = await connectRedmine(draft);
      dispatch(setAppData(saved));
      setSettingsDraft(null);
      notify(`Подключение проверено. Загружено пользовательских полей: ${saved.settings.customFields.length}`);
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
      <fieldset disabled={saving} className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextInput
                label="URL Redmine"
                type="url"
                placeholder="https://redmine.example.com"
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
              При сохранении загружаются профиль пользователя, справочник деятельностей и пользовательские поля
              из одной назначенной вам задачи. В других проектах набор полей может отличаться.
              Если проверка не пройдёт, настройки подключения не изменятся.
            </p>
          </div>
          {draft.redmineUrl && <p className="mt-4 text-xs text-zinc-400">Загружено пользовательских полей: {data?.settings.customFields.length ?? 0}.
            Если назначенных задач нет, список будет пуст. Для обновления списка сохраните настройки повторно.</p>}
        </div>
      </fieldset>
      <div className="mt-4 flex shrink-0 justify-end border-t border-zinc-800 pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
          icon={<Save size={16} />}
        >
          {saving ? "Проверка подключения..." : "Сохранить настройки"}
        </Button>
      </div>
    </form>
  );
}
