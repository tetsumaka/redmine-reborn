import React, { useEffect, useMemo, useState } from "react";
import { TimeEntriesTable } from "src/renderer/components/TimeEntriesTable";
import { TimeEntryForm } from "src/renderer/components/TimeEntryForm";
import { DayToolbar } from "src/renderer/components/Toolbar";
import { MONTHS } from "src/renderer/constants";
import { useAppDispatch, useAppSelector } from "src/renderer/store/hooks";
import {
  addDaysIso,
  durationMinutes,
  entryPeriod,
  formatMinutes,
  isoToDisplayDate,
  periodKey,
  todayIso,
} from "src/renderer/utils";
import {
  addEntry as addEntryAction,
  deleteEntry as deleteEntryAction,
  setAppData,
} from "../store/appDataSlice";
import { Entry } from "src/main/types";
import { useToast } from "src/renderer/hooks/useToast";

function compareEntriesNewestFirst(left: Entry, right: Entry): number {
  const leftTime = Date.parse(left.createdAt ?? "");
  const rightTime = Date.parse(right.createdAt ?? "");
  const leftHasTime = Number.isFinite(leftTime);
  const rightHasTime = Number.isFinite(rightTime);
  if (leftHasTime && rightHasTime) return rightTime - leftTime;
  if (leftHasTime) return -1;
  if (rightHasTime) return 1;
  return 0;
}

export function TimeEntries(): React.JSX.Element {
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

  const addEntry = (entry: Entry) => {
    dispatch(addEntryAction(entry));
  };

  const deleteEntry = (target: Entry) => {
    dispatch(deleteEntryAction(target.id));
  };

  const sync = async () => {
    if (!data) return;
    setSyncing(true);
    try {
      await window.timeTracker.save(data);
      const result = await window.timeTracker.sync(selectedDisplayDate);
      dispatch(setAppData(await window.timeTracker.load()));
      if (result.errors.length) {
        notify(
          `Отправлено: ${result.synced}. Загружено: ${result.downloaded}. Удалено: ${result.deleted}. Ошибок: ${result.errors.length}. ${result.errors[0].message}`,
          "error",
        );
      } else {
        notify(
          `Отправлено: ${result.synced}. Загружено из Redmine: ${result.downloaded}. Удалено: ${result.deleted}`,
        );
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSyncing(false);
    }
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
            onPreviousDay={() =>
              setSelectedDate((current) => addDaysIso(current, -1))
            }
            onNextDay={() =>
              setSelectedDate((current) => addDaysIso(current, 1))
            }
            onSync={sync}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <TimeEntryForm date={selectedDisplayDate} onAdd={addEntry} />
            <TimeEntriesTable
              entries={visibleDayEntries}
              redmineUrl={data.settings.redmineUrl}
              onDelete={deleteEntry}
            />
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
