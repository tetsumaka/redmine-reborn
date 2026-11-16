import { saveAppData } from "src/entities/app-data";
import { getNotificationStatus } from "src/features/issue-events";
import { notificationPermission, requestNotificationPermission, testNotification } from "src/shared/lib/notifications";
import { useEffect, useState } from "react";
import { BellRing, Save } from "lucide-react";
import type { NotificationListenerStatus } from "src/features/issue-events";
import type { NotificationPermissionState } from "src/shared/lib/notifications";
import type { EventSources } from "src/entities/settings";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS, MIN_NOTIFICATION_POLL_INTERVAL_SECONDS, MAX_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/config/domain";
import { Button } from "src/shared/ui/Button";
import { NumberInput } from "src/shared/ui/NumberInput";
import { useToast } from "src/features/show-toast";
import { setSettings } from "src/entities/app-data";
import { useAppDispatch, useAppSelector } from "src/shared/lib/store";

function SettingsToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-zinc-100">
    <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-700 transition after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:bg-sky-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400" />
    {label}
  </label>;
}

export function NotificationSettingsPage() {
  const data = useAppSelector((state) => state.appData.data);
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const [pollingEnabled, setPollingEnabled] = useState(data?.settings.eventsPollingEnabled ?? true);
  const [eventSources, setEventSources] = useState<EventSources>(() => ({
    assigned: true, qa: true, codeReviewer: true, watched: true, ...data?.settings.eventSources,
  }));
  const [pushEnabled, setPushEnabled] = useState(data?.settings.notificationsEnabled ?? true);
  const [interval, setInterval] = useState(String(data?.settings.notificationPollIntervalSeconds ?? DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS));
  const [permission, setPermission] = useState<NotificationPermissionState>(() => notificationPermission());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<NotificationListenerStatus | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setPermission(notificationPermission());
      void getNotificationStatus().then(
        (result) => { if (active) setStatus(result); },
        (error: unknown) => { if (active) setStatus({ enabled: false, lastCheckedAt: null, error: String(error) }); },
      );
    };
    refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const save = async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      const seconds = pollingEnabled ? Number(interval) : data.settings.notificationPollIntervalSeconds;
      if (!Number.isInteger(seconds) || seconds < MIN_NOTIFICATION_POLL_INTERVAL_SECONDS || seconds > MAX_NOTIFICATION_POLL_INTERVAL_SECONDS) {
        throw new Error(`Укажите интервал от ${MIN_NOTIFICATION_POLL_INTERVAL_SECONDS} до ${MAX_NOTIFICATION_POLL_INTERVAL_SECONDS} секунд`);
      }
      const settings = { ...data.settings, eventSources, eventsPollingEnabled: pollingEnabled, notificationsEnabled: pushEnabled, notificationPollIntervalSeconds: seconds };
      await saveAppData({ ...data, settings });
      dispatch(setSettings(settings));
      setStatus(await getNotificationStatus());
      notify("Настройки событий сохранены");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try { await testNotification(); }
    catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
    finally { setTesting(false); setPermission(notificationPermission()); }
  };

  const enableNotifications = (enabled: boolean) => {
    setPushEnabled(enabled);
    if (enabled) void requestNotificationPermission().then(setPermission).catch((error: unknown) => notify(String(error), "error"));
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <fieldset disabled={saving} className="max-w-3xl space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6 disabled:opacity-60">
          <div>
            <h2 className="mb-4 text-lg font-extrabold">События</h2>
            <SettingsToggle label="Периодический опрос событий" checked={pollingEnabled} onChange={setPollingEnabled} />
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">События сохраняются в IndexedDB, пока приложение открыто. В фоне браузер может замедлить или приостановить опрос; после закрытия приложения опрос прекращается. Для загрузки истории дня нажмите «Обновить события».</p>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-bold">Для каких задач получать события</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {([
                ["assigned", "Назначено мне"], ["qa", "Я — QA"],
                ["codeReviewer", "Я — CodeReviewer"], ["watched", "Отслеживаемые"],
              ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                <input type="checkbox" checked={eventSources[key]} onChange={(event) => setEventSources((current) => ({ ...current, [key]: event.target.checked }))} />
                {label}
              </label>)}
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">Достаточно совпадения с одним выбранным условием. Фильтр применяется к опросу и загрузке истории; уже сохранённые события остаются в истории.</p>
            {!Object.values(eventSources).some(Boolean) && <p className="text-xs text-amber-300">Ни одно условие не выбрано: новые события поступать не будут.</p>}
          </div>
          {pollingEnabled && <>
            <div className="max-w-xs">
              <NumberInput label="Интервал опроса, секунды" min={String(MIN_NOTIFICATION_POLL_INTERVAL_SECONDS)} max={String(MAX_NOTIFICATION_POLL_INTERVAL_SECONDS)} required value={interval} onChange={(event) => setInterval(event.target.value)} />
            </div>
            <div className="space-y-4 border-t border-zinc-800 pt-5">
              <SettingsToggle label="Браузерные уведомления" checked={pushEnabled} onChange={enableNotifications} />
              <p className="text-xs text-zinc-400">При выключенных уведомлениях опрос продолжает добавлять события в историю. Оформление и положение уведомлений определяет браузер и операционная система.</p>
              <p className="text-xs text-zinc-400" role="status">{permission === "granted" ? "Разрешение браузера получено" : permission === "denied" ? "Уведомления заблокированы. Разрешите их в настройках сайта в браузере." : permission === "unsupported" ? "Уведомления недоступны: требуется поддерживаемый браузер и HTTPS или localhost." : "Для уведомлений требуется разрешение браузера"}</p>
              {pushEnabled && <>
                <Button icon={<BellRing size={16} />} onClick={() => { void test(); }} disabled={testing}>{testing ? "Отправка…" : "Показать тестовое уведомление"}</Button>
              </>}
            </div>
          </>}
          <div className="border-t border-zinc-800 pt-4 text-sm" aria-live="polite">
            {status?.error ? <p role="alert" className="text-red-300">{status.error}</p> : <p className="text-zinc-400">
              {!status ? "Загрузка состояния…" : !status.enabled ? "Периодический опрос отключён" : status.lastCheckedAt
                ? `Последний успешный опрос: ${new Date(status.lastCheckedAt).toLocaleString("ru-RU")}` : "Ожидание первого опроса…"}
            </p>}
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex shrink-0 justify-end border-t border-zinc-800 pt-4">
        <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>{saving ? "Сохранение…" : "Сохранить настройки"}</Button>
      </div>
    </form>
  );
}
