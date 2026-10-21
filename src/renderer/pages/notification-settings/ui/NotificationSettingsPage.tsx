import { useEffect, useId, useState } from "react";
import { BellRing, CircleHelp, Save } from "lucide-react";
import type { NotificationListenerStatus, NotificationPosition } from "src/shared/types";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS, MIN_NOTIFICATION_POLL_INTERVAL_SECONDS, MAX_NOTIFICATION_POLL_INTERVAL_SECONDS } from "src/shared/constants";
import { api } from "src/renderer/shared/api/api";
import { Button } from "src/renderer/shared/ui/Button";
import { NumberInput } from "src/renderer/shared/ui/NumberInput";
import { Selector } from "src/renderer/shared/ui/Selector";
import { useToast } from "src/renderer/features/show-toast";
import { setSettings } from "src/renderer/entities/app-data";
import { useAppDispatch, useAppSelector } from "src/renderer/app/providers/store/hooks";

export function NotificationSettingsPage() {
  const data = useAppSelector((state) => state.appData.data);
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const helpId = useId();
  const [enabled, setEnabled] = useState(data?.settings.notificationsEnabled ?? true);
  const [interval, setInterval] = useState(String(data?.settings.notificationPollIntervalSeconds ?? DEFAULT_NOTIFICATION_POLL_INTERVAL_SECONDS));
  const [position, setPosition] = useState<NotificationPosition>(data?.settings.notificationPosition ?? "bottom-right");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<NotificationListenerStatus | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api().getNotificationStatus().then(
        (result) => { if (active) setStatus(result); },
        (error: unknown) => {
          if (active) setStatus({ enabled: false, lastCheckedAt: null, error: String(error) });
        },
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
      const seconds = Number(interval);
      if (!Number.isInteger(seconds) || seconds < MIN_NOTIFICATION_POLL_INTERVAL_SECONDS || seconds > MAX_NOTIFICATION_POLL_INTERVAL_SECONDS) {
        throw new Error(`Укажите интервал от ${MIN_NOTIFICATION_POLL_INTERVAL_SECONDS} до ${MAX_NOTIFICATION_POLL_INTERVAL_SECONDS} секунд`);
      }
      const settings = { ...data.settings, notificationsEnabled: enabled, notificationPollIntervalSeconds: seconds, notificationPosition: position };
      await api().save({ ...data, settings });
      dispatch(setSettings(settings));
      setStatus(await api().getNotificationStatus());
      notify("Настройки уведомлений сохранены");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await api().testNotification();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-zinc-100">
              <input
                type="checkbox"
                className="size-4 accent-sky-500"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Получать уведомления об изменениях задач
            </label>
            <span className="group relative inline-flex shrink-0">
              <button
                type="button"
                aria-label="Как работают уведомления"
                aria-describedby={helpId}
                className="flex size-5 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                <CircleHelp size={18} />
              </button>
              <span
                id={helpId}
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-96 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs leading-relaxed text-zinc-300 shadow-xl group-hover:block group-focus-within:block"
              >
                <span className="block">В открытых задачах отслеживаются комментарии и смена статуса в назначенных вам задачах и задачах, где вы наблюдатель, назначение на вас, а также упоминания вас в других задачах. Уведомления о закрытии тоже приходят. Комментарии и другие изменения в уже закрытых задачах не показываются. Проверка работает, пока приложение открыто, в том числе в свёрнутом виде. Собственные действия не показываются.</span>
                <span className="mt-2 block">При каждом запуске отслеживаются события с момента открытия приложения. Номер задачи в уведомлении ведёт к конкретному изменению или комментарию в Redmine.</span>
                <span className="mt-2 block">Тест доступен и при выключенном прослушивании. Нажмите несколько раз, чтобы проверить расположение уведомлений.</span>
              </span>
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <NumberInput
              label="Интервал проверки, секунды"
              min={String(MIN_NOTIFICATION_POLL_INTERVAL_SECONDS)}
              max={String(MAX_NOTIFICATION_POLL_INTERVAL_SECONDS)}
              required
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
            />
            <Selector
              label="Расположение уведомлений"
              value={position}
              options={[
                { value: "bottom-right", label: "Справа снизу" },
                { value: "top-right", label: "Справа сверху" },
                { value: "top-left", label: "Слева сверху" },
                { value: "bottom-left", label: "Слева снизу" },
              ]}
              onChange={(event) => setPosition(event.target.value as NotificationPosition)}
            />
          </div>
          <div className="mt-5 border-t border-zinc-800 pt-4 text-sm" aria-live="polite">
            {status?.error ? <p role="alert" className="text-red-300">{status.error}</p> : (
              <p className="text-zinc-400">
                {!status ? "Загрузка состояния…" : !status.enabled ? "Прослушивание отключено" : status.lastCheckedAt
                  ? `Последняя успешная проверка: ${new Date(status.lastCheckedAt).toLocaleString("ru-RU")}`
                  : "Ожидание первой проверки…"}
              </p>
            )}
          </div>
          <div className="mt-5">
            <Button icon={<BellRing size={16} />} onClick={() => { void test(); }} disabled={testing}>
              {testing ? "Отправка…" : "Показать тестовое уведомление"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex shrink-0 justify-end border-t border-zinc-800 pt-4">
        <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </Button>
      </div>
    </form>
  );
}
