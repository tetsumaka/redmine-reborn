import { useEffect, useRef, useState, type FormEvent } from "react";
import { FolderOpen, Save, X } from "lucide-react";
import { ACTIVITY_ID_PLACEHOLDERS } from "../constants";
import type { Settings } from "../types";
import { ModalWindow, NumberInput, TextInput } from "./ui";
import { Button } from "../shared/ui/Button";
import { ACTIVITIES } from "src/shared/constants";

type SettingsDialogProps = {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void>;
};

export function SettingsDialog({
  settings,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Settings>(() => ({
    ...settings,
    activityIds: { ...settings.activityIds },
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const chooseCertificate = async () => {
    const path = await window.timeTracker.chooseCertificate();
    if (path) update("certificatePath", path);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...draft,
        redmineUrl: draft.redmineUrl.trim(),
        apiKey: draft.apiKey.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWindow ref={dialogRef} onCancel={onClose}>
      <form onSubmit={submit} className="p-6">
        <div className="mb-5 flex items-start justify-between gap-5">
          <div>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-300">
              Подключение
            </div>
            <h2 className="text-xl font-extrabold text-zinc-50">
              Настройки Redmine
            </h2>
          </div>
          <Button
            icon={<X size={16} />}
            iconOnly
            fill="outline"
            aria-label="Закрыть"
            onClick={onClose}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            className="col-span-2"
            label="URL Redmine"
            type="url"
            placeholder="https://redmine.company.ru"
            required
            value={draft.redmineUrl}
            onChange={(event) => update("redmineUrl", event.target.value)}
          />
          <TextInput
            className="col-span-2"
            label="API-ключ"
            type="password"
            autoComplete="off"
            required
            value={draft.apiKey}
            onChange={(event) => update("apiKey", event.target.value)}
          />
          <NumberInput
            className="col-span-2"
            label="ID пользователя Redmine"
            min="1"
            required
            value={draft.userId}
            onChange={(event) => update("userId", event.target.value)}
          />
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
        <div className="mt-6 flex justify-end">
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
    </ModalWindow>
  );
}
