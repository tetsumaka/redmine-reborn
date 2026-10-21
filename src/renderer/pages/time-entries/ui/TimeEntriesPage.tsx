import type { TimeEntry, RedminePullScope, SyncResult } from "src/shared/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TimeEntriesTable } from "src/renderer/widgets/time-entries-table";
import { TimeEntryForm } from "src/renderer/features/add-time-entry";
import { DayToolbar } from "src/renderer/widgets/day-toolbar";
import { ModalWindow } from "src/renderer/shared/ui/ModalWindow";
import { Button } from "src/renderer/shared/ui/Button";
import { MONTHS } from "src/renderer/shared/config/constants";
import { useToast } from "src/renderer/features/show-toast";
import { useAppDispatch, useAppSelector } from "src/renderer/app/providers/store/hooks";
import { durationMinutes, entryPeriod } from "src/renderer/entities/time-entry";
import {
  isoToDisplayDate,
  periodKey,
  todayIso,
} from "src/renderer/shared/lib/date";
import { formatMinutes } from "src/renderer/shared/lib/duration";
import { api } from "src/renderer/shared/api/api";
import {
  addEntry as addEntryAction,
  deleteEntry as deleteEntryAction,
  setAppData,
} from "src/renderer/entities/app-data";

function compareEntriesNewestFirst(left: TimeEntry, right: TimeEntry): number {
  const leftTime = Date.parse(left.createdAt ?? "");
  const rightTime = Date.parse(right.createdAt ?? "");
  const leftHasTime = Number.isFinite(leftTime);
  const rightHasTime = Number.isFinite(rightTime);
  if (leftHasTime && rightHasTime) return rightTime - leftTime;
  if (leftHasTime) return -1;
  if (rightHasTime) return 1;
  return 0;
}

function resultDetails(result: SyncResult): string {
  return `Отправлено: ${result.synced}. Загружено из Redmine: ${result.downloaded}. Удалено: ${result.deleted}.`;
}

export function TimeEntriesPage(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const { notify } = useToast();
  const [initialDate] = useState(() => todayIso());
  const [initialPeriod] = useState(() => {
    const [year, month] = initialDate.split("-").map(Number);
    return periodKey(year, month);
  });
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(initialPeriod);
  const [syncing, setSyncing] = useState(false);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const overwriteDialogRef = useRef<HTMLDialogElement>(null);

  const selectedDisplayDate = useMemo(
    () => isoToDisplayDate(selectedDate),
    [selectedDate],
  );

  const availablePeriods = useMemo(() => {
    const values = new Map<
      string,
      { year: number; month: number; label: string }
    >();
    data?.entries.forEach((entry) => {
      const period = entryPeriod(entry);
      if (!period) return;
      values.set(periodKey(period.year, period.month), {
        ...period,
        label: `${MONTHS[period.month - 1]} ${period.year}`,
      });
    });
    return [...values.entries()]
      .map(([value, period]) => ({ value, ...period }))
      .sort(
        (left, right) => right.year - left.year || right.month - left.month,
      );
  }, [data?.entries]);

  useEffect(() => {
    if (!availablePeriods.length) return;
    if (
      !availablePeriods.some((period) => period.value === selectedPeriodKey)
    ) {
      setSelectedPeriodKey(availablePeriods[0].value);
    }
  }, [availablePeriods, selectedPeriodKey]);

  useEffect(() => {
    const dialog = overwriteDialogRef.current;
    if (!dialog) return;
    if (confirmingOverwrite && !dialog.open) {
      dialog.showModal();
    } else if (!confirmingOverwrite && dialog.open) {
      dialog.close();
    }
  }, [confirmingOverwrite]);

  const visibleDayEntries = useMemo(() => {
    const entries =
      data?.entries.filter((entry) => entry.date === selectedDisplayDate) ?? [];
    return [...entries].sort(compareEntriesNewestFirst);
  }, [data?.entries, selectedDisplayDate]);

  const daySummary = useMemo(() => {
    const totalMinutes = visibleDayEntries.reduce(
      (total, entry) => total + durationMinutes(entry),
      0,
    );
    return `${visibleDayEntries.length} записей · ${formatMinutes(totalMinutes)}`;
  }, [visibleDayEntries]);

  const addEntry = (entry: TimeEntry) => {
    dispatch(addEntryAction(entry));
  };

  const deleteEntry = (target: TimeEntry) => {
    dispatch(deleteEntryAction(target.id));
  };

  const runRedmineAction = async (
    action: () => Promise<SyncResult>,
    successMessage: (result: SyncResult) => string,
  ) => {
    if (!data) return;
    setSyncing(true);
    try {
      await api().save(data);
      const result = await action();
      dispatch(setAppData(await api().load()));
      if (result.errors.length) {
        notify(
          `${resultDetails(result)} Ошибок: ${result.errors.length}. ${result.errors[0].message}`,
          "error",
        );
      } else {
        notify(successMessage(result));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSyncing(false);
    }
  };

  const pullFromRedmine = (scope: RedminePullScope) => {
    void runRedmineAction(
      () => api().pullFromRedmine(selectedDisplayDate, scope),
      (result) =>
        scope === "day"
          ? `День обновлён из Redmine. Загружено: ${result.downloaded}. Локальные несинхронизированные записи сохранены.`
          : `Месяц обновлён из Redmine. Загружено: ${result.downloaded}. Локальные несинхронизированные записи сохранены.`,
    );
  };

  const overwriteRedmineDay = () => {
    setConfirmingOverwrite(false);
    void runRedmineAction(
      () => api().overwriteRedmineDay(selectedDisplayDate),
      (result) =>
        `Redmine перезаписан за выбранный день. ${resultDetails(result)}`,
    );
  };

  return (
    <>
      {data ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DayToolbar
            selectedDate={selectedDate}
            summary={daySummary}
            syncing={syncing}
            onDateChange={setSelectedDate}
            onPullDay={() => pullFromRedmine("day")}
            onPullMonth={() => pullFromRedmine("month")}
            onOverwriteDay={() => setConfirmingOverwrite(true)}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <TimeEntryForm date={selectedDisplayDate} onAdd={addEntry} />
            <TimeEntriesTable
              entries={visibleDayEntries}
              redmineUrl={data.settings.redmineUrl}
              onDelete={deleteEntry}
            />
          </div>
          {confirmingOverwrite && (
            <ModalWindow
              ref={overwriteDialogRef}
              onClose={() => setConfirmingOverwrite(false)}
            >
              <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-extrabold text-zinc-50">
                    Перезаписать день в Redmine?
                  </h2>
                  <p className="text-sm leading-6 text-zinc-300">
                    За {selectedDisplayDate} в Redmine будут удалены все записи
                    времени, затем будут созданы записи из текущей таблицы.
                  </p>
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                    {visibleDayEntries.length > 0
                      ? `Будет создано записей из таблицы: ${visibleDayEntries.length}. Записи с любым статусом синхронизации попадут в Redmine.`
                      : "В таблице нет записей. Это действие очистит выбранный день в Redmine."}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    fill="outline"
                    onClick={() => setConfirmingOverwrite(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="danger"
                    onClick={overwriteRedmineDay}
                    disabled={syncing}
                  >
                    Перезаписать Redmine
                  </Button>
                </div>
              </div>
            </ModalWindow>
          )}
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
