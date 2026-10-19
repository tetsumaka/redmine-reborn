import type { AppSettings } from "src/shared/types";
import { useState, type FormEvent } from "react";
import { FolderOpen, Save } from "lucide-react";
import { ACTIVITY_ID_PLACEHOLDERS } from "src/renderer/shared/config/constants";
import { useToast } from "src/renderer/features/show-toast";
import { Button } from "src/renderer/shared/ui/Button";
import { NumberInput } from "src/renderer/shared/ui/NumberInput";
import { TextInput } from "src/renderer/shared/ui/TextInput";
import { ACTIVITIES } from "src/shared/constants";
import { api } from "src/renderer/shared/api/api";
import { setSettings } from "src/renderer/entities/app-data";
import {
  useAppDispatch,
  useAppSelector,
} from "src/renderer/app/providers/store/hooks";

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

  const chooseCertificate = async () => {
    try {
      const path = await api().chooseCertificate();
      if (path) update("certificatePath", path);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
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
