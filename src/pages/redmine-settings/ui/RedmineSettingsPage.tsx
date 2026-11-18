import { setAppData } from "src/entities/app-data";
import { connectRedmine } from "src/features/connect-redmine";
import type { AppSettings } from "src/entities/settings";
import { useState, type FormEvent } from "react";
import { Save, Upload, X } from "lucide-react";
import { desktopApi, desktopValue } from "src/shared/api/desktop";
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
  const [choosingCertificate, setChoosingCertificate] = useState(false);
  const update = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettingsDraft((current) => {
      const settings = current ?? data?.settings;
      return settings ? { ...settings, [key]: value } : null;
    });
  };

  const selectCertificate = async () => {
    if (saving || choosingCertificate) return;
    setChoosingCertificate(true);
    try {
      const certificate = desktopValue(await desktopApi().chooseCertificate());
      if (certificate) update("certificate", certificate);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally { setChoosingCertificate(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !draft || saving || choosingCertificate) return;
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
      <fieldset disabled={saving || choosingCertificate} className="min-h-0 flex-1 overflow-auto">
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
            <div className="col-span-2">
              <div className="mb-1 text-xs font-medium text-zinc-400">Сертификат Redmine</div>
              <div className="flex items-center gap-2">
                <Button icon={<Upload size={16} />} onClick={() => void selectCertificate()}>Загрузить .crt</Button>
                <span className="min-w-0 truncate text-sm text-zinc-300" title={draft.certificate?.name}>
                  {draft.certificate?.name ?? "Используется системное хранилище сертификатов"}
                </span>
                {draft.certificate && <Button iconOnly icon={<X size={16} />} ariaLabel="Удалить сертификат" onClick={() => update("certificate", null)} />}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Если сертификат Redmine не доверен в системе, загрузите сертификат сервера или центра сертификации (.crt, .cer, .pem).
                Файл сохранится в профиле приложения после проверки подключения. Имя сервера и срок действия сертификата проверяются.
              </p>
            </div>
            <p className="col-span-2 text-xs leading-relaxed text-zinc-400">
              API-ключ хранится в локальном профиле приложения
              и передаётся Redmine в заголовке X-Redmine-API-Key.
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
          disabled={saving || choosingCertificate}
          icon={<Save size={16} />}
        >
          {saving ? "Проверка подключения..." : "Сохранить настройки"}
        </Button>
      </div>
    </form>
  );
}
