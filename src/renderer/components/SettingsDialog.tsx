import { useEffect, useRef, useState, type FormEvent } from "react";
import { ACTIVITIES } from "../constants";
import type { Settings } from "../types";

type SettingsDialogProps = {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void>;
};

export function SettingsDialog({ settings, onClose, onSave }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Settings>(() => ({ ...settings, activityIds: { ...settings.activityIds } }));
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
      await onSave({ ...draft, redmineUrl: draft.redmineUrl.trim(), apiKey: draft.apiKey.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} onCancel={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-header">
          <div><div className="eyebrow">Подключение</div><h2>Настройки Redmine</h2></div>
          <button type="button" className="icon-button" onClick={onClose}>x</button>
        </div>
        <div className="form-grid">
          <label className="wide">URL Redmine
            <input type="url" placeholder="https://redmine.company.ru" required value={draft.redmineUrl} onChange={(event) => update("redmineUrl", event.target.value)} />
          </label>
          <label className="wide">API-ключ
            <input type="password" autoComplete="off" required value={draft.apiKey} onChange={(event) => update("apiKey", event.target.value)} />
          </label>
          <label className="wide">ID пользователя Redmine
            <input type="number" min="1" required value={draft.userId} onChange={(event) => update("userId", event.target.value)} />
          </label>
          <label className="wide">CA-сертификат (PEM, CRT или CER)
            <div className="file-field">
              <input readOnly required value={draft.certificatePath} />
              <button type="button" className="button secondary" onClick={chooseCertificate}>Выбрать</button>
            </div>
          </label>
        </div>
        <h3>ID деятельностей в Redmine</h3>
        <p className="hint">ID находятся в администрировании Redmine: Учёт времени → Виды деятельности.</p>
        <div className="activity-grid">
          {ACTIVITIES.map((activity) => (
            <label key={activity}>{activity}
              <input
                type="number"
                min="1"
                value={draft.activityIds[activity] ?? ""}
                onChange={(event) => {
                  const activityIds = { ...draft.activityIds };
                  if (event.target.value) activityIds[activity] = Number(event.target.value);
                  else delete activityIds[activity];
                  update("activityIds", activityIds);
                }}
              />
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="submit" className="button primary" disabled={saving}>{saving ? "Сохранение..." : "Сохранить настройки"}</button>
        </div>
      </form>
    </dialog>
  );
}
