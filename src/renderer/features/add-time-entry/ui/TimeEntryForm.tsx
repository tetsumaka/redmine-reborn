import type { TimeEntry, ActivityType } from "src/shared/types";
import { Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createEntry } from "src/renderer/entities/time-entry";
import {
  formatDuration,
  formatTimer,
  intervalDuration,
  parseDuration,
} from "src/renderer/shared/lib/duration";
import { Button } from "src/renderer/shared/ui/Button";
import { ButtonToggle } from "src/renderer/shared/ui/ButtonToggle";
import { NumberInput } from "src/renderer/shared/ui/NumberInput";
import { Selector } from "src/renderer/shared/ui/Selector";
import { TextInput } from "src/renderer/shared/ui/TextInput";
import { TimePicker } from "src/renderer/shared/ui/TimePicker";
import { ACTIVITIES } from "src/shared/constants";
import { api } from "src/renderer/shared/api/api";

type TimeMode = "manual" | "interval" | "timer";

type TimeEntryFormProps = {
  date: string;
  onAdd: (entry: TimeEntry) => void;
};

const timeModeOptions: Array<{ value: TimeMode; label: string }> = [
  { value: "manual", label: "Вручную" },
  { value: "interval", label: "Интервал" },
  { value: "timer", label: "Таймер" },
];

export function TimeEntryForm({ date, onAdd }: TimeEntryFormProps) {
  const [issueId, setIssueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState<ActivityType>("Code");
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState<TimeMode>("manual");
  const [manualDuration, setManualDuration] = useState("01:00");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");

  const timerRunning = timerStartedAt !== null;
  const timerSeconds = useMemo(() => {
    if (!timerStartedAt) return timerBaseSeconds;
    return timerBaseSeconds + Math.floor((Date.now() - timerStartedAt) / 1000);
  }, [timerBaseSeconds, timerStartedAt, tick]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(
      () => setTick((current) => current + 1),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const intervalMinutes = intervalDuration(start, end);
  const previewMinutes =
    mode === "manual"
      ? parseDuration(manualDuration)
      : mode === "interval"
        ? intervalMinutes
        : timerSeconds > 0
          ? Math.ceil(timerSeconds / 60)
          : null;

  const resetTimer = () => {
    setTimerBaseSeconds(0);
    setTimerStartedAt(null);
    setTick(0);
  };

  const toggleTimer = () => {
    if (timerStartedAt) {
      setTimerBaseSeconds(timerSeconds);
      setTimerStartedAt(null);
      return;
    }
    setTimerStartedAt(Date.now());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const normalizedIssueId = issueId.trim();
    if (!/^\d+$/.test(normalizedIssueId)) {
      setError("Номер задачи должен состоять из цифр");
      return;
    }
    if (!previewMinutes) {
      setError("Укажите положительное время");
      return;
    }

    setSubmitting(true);
    let issue;
    try {
      issue = await api().getIssue(normalizedIssueId);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : String(loadError);
      setError(`Не удалось найти задачу #${normalizedIssueId}: ${message}`);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);

    onAdd(
      createEntry(date, {
        issueId: normalizedIssueId,
        tracker: issue.tracker,
        subject: issue.subject,
        estimatedHours: issue.estimatedHours,
        activity,
        comment,
        minutes: previewMinutes,
        start: mode === "interval" ? start : undefined,
        end: mode === "interval" ? end : undefined,
      }),
    );
    setIssueId("");
    setComment("");
    resetTimer();
  };

  return (
    <form
      onSubmit={submit}
      className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-black/20"
    >
      <div className="grid grid-cols-[130px_140px_minmax(260px,1fr)_360px_auto] items-end gap-3">
        <NumberInput
          label="Номер задачи"
          min="1"
          required
          value={issueId}
          onChange={(event) => setIssueId(event.target.value)}
        />
        <Selector
          label="Деятельность"
          value={activity}
          onChange={(event) => setActivity(event.target.value as ActivityType)}
          options={ACTIVITIES.map((value) => ({ value, label: value }))}
        />
        <TextInput
          label="Комментарий"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <div className="min-w-0">
          <div className="mb-1.5 flex justify-start">
            <ButtonToggle
              value={mode}
              options={timeModeOptions}
              onChange={setMode}
            />
          </div>
          <div className="flex min-h-10 w-full items-center gap-2">
            {mode === "manual" && (
              <div className="w-[88px]">
                <TimePicker
                  mode="duration"
                  ariaLabel="Время вручную"
                  value={manualDuration}
                  onChange={(event) => setManualDuration(event.target.value)}
                />
              </div>
            )}
            {mode === "interval" && (
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <div className="min-w-0">
                  <TimePicker
                    ariaLabel="Начало"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </div>
                <div className="min-w-0">
                  <TimePicker
                    ariaLabel="Конец"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </div>
              </div>
            )}
            {mode === "timer" && (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="w-[204px] [&>button]:w-full">
                  <Button
                    variant={timerRunning ? "primary" : "secondary"}
                    fill={timerRunning ? "outline" : "fill"}
                    icon={
                      timerRunning ? <Pause size={16} /> : <Play size={16} />
                    }
                    onClick={toggleTimer}
                  >
                    {timerRunning
                      ? formatTimer(timerSeconds)
                      : "Запустить таймер"}
                  </Button>
                </div>
                <Button
                  icon={<RotateCcw size={16} />}
                  iconOnly
                  title="Сбросить таймер"
                  ariaLabel="Сбросить таймер"
                  onClick={resetTimer}
                  disabled={timerSeconds === 0}
                />
              </div>
            )}
            <span
              className={`flex h-10 w-[62px] items-center justify-center whitespace-nowrap rounded-md border text-sm font-bold tabular-nums ${
                previewMinutes
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-zinc-700 bg-zinc-950 text-zinc-500"
              }`}
            >
              {previewMinutes ? formatDuration(previewMinutes) : "--:--"}
            </span>
          </div>
        </div>
        <Button
          type="submit"
          variant="primary"
          icon={<Plus size={16} />}
          disabled={submitting}
        >
          {submitting ? "Загрузка" : "Добавить"}
        </Button>
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}
    </form>
  );
}
