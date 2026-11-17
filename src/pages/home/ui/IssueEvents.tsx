import { RefreshCw } from "lucide-react";
import type { AppSettings } from "src/entities/settings";
import { issueEventUrl } from "src/entities/issue-event";
import { isoToDisplayDate, todayIso } from "src/shared/lib/date";
import { Button } from "src/shared/ui/Button";
import { DayPicker } from "src/shared/ui/DayPicker";
import { Table } from "src/shared/ui/Table";
import { useIssueEvents } from "../model/useIssueEvents";
import { useIssuePollingStatus } from "../model/useIssuePollingStatus";

type IssueEventsProps = {
  settings: AppSettings | undefined;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

const timeFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function IssueEvents({ settings, selectedDate, onDateChange }: IssueEventsProps) {
  const { events, errors, error, loading, refreshing, configured, refresh } = useIssueEvents(settings, selectedDate);
  const pollingStatus = useIssuePollingStatus(settings, selectedDate);
  const emptyMessage = !configured
    ? "Для загрузки событий заполните подключение во вкладке «Настройки → Redmine»."
    : loading ? "Загрузка событий…"
    : refreshing ? "Обновление событий…"
    : error ?? (errors.length
      ? "Не удалось загрузить все события. Попробуйте обновить данные."
      : `За ${isoToDisplayDate(selectedDate)} нет сохранённых событий. Нажмите «Обновить события», чтобы загрузить историю дня.`);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
        <DayPicker
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          summary={loading ? "Загрузка…" : `Событий: ${events.length}${refreshing ? " · Обновление…" : ""}`}
        />
        <Button icon={<RefreshCw size={16} />} onClick={refresh} disabled={!configured || loading || refreshing}>
          {refreshing ? "Обновление…" : "Обновить события"}
        </Button>
      </section>
      {configured && selectedDate === todayIso() && <div className="mb-4 shrink-0 space-y-1 text-xs text-zinc-400" aria-live="polite">
        <p>{pollingStatus?.lastCheckedAt
          ? <>Последний успешный опрос: <time dateTime={pollingStatus.lastCheckedAt}>{new Date(pollingStatus.lastCheckedAt).toLocaleString("ru-RU")}</time>{!pollingStatus.enabled && " · Периодический опрос отключён"}</>
          : !pollingStatus ? "Загрузка состояния опроса…"
          : pollingStatus.enabled ? "Ожидание первого опроса…" : "Периодический опрос отключён"}</p>
        {pollingStatus?.error && <p role="alert" className="text-red-300">Ошибка опроса: {pollingStatus.error}</p>}
      </div>}
      {error && events.length > 0 && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
      {errors.length > 0 && (
        <p role="alert" className="mb-4 shrink-0 break-words rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Не удалось загрузить историю задач: {errors.length}. Список событий может быть неполным. {errors[0]}
        </p>
      )}
      <Table
        minWidth={1100}
        headers={[
          { key: "time", component: "Время" },
          { key: "event", component: "Событие" },
          { key: "title", component: "Название" },
          { key: "comment", component: "Комментарий" },
        ]}
        rows={events.map((event) => ({
          key: event.key,
          component: (
            <tr className="align-top transition hover:bg-zinc-800/70">
              <td className="whitespace-nowrap border-t border-zinc-800 px-3 py-2 font-mono text-zinc-400">
                <time dateTime={new Date(event.createdAt).toISOString()}>{timeFormat.format(event.createdAt)}</time>
              </td>
              <td className="min-w-60 max-w-sm break-words border-t border-zinc-800 px-3 py-2 text-zinc-200">
                {event.message.replace(/^@/, "")}{" "}
                <a
                  href={issueEventUrl(settings?.redmineUrl ?? "", event.issueId, event.journalId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                >
                  #{event.issueId}
                </a>
              </td>
              <td className="min-w-60 max-w-sm break-words border-t border-zinc-800 px-3 py-2 text-zinc-100">{event.title}</td>
              <td className="min-w-64 max-w-md break-words border-t border-zinc-800 px-3 py-2 text-zinc-400">{event.comment ?? "—"}</td>
            </tr>
          ),
        }))}
        emptyState={
          <p role={error ? "alert" : "status"} className={`px-3 py-6 text-center text-sm ${error ? "text-red-300" : "text-zinc-400"}`}>
            {emptyMessage}
          </p>
        }
      />
    </div>
  );
}
