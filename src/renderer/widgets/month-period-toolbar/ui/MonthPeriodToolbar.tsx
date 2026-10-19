import React, { useEffect, useMemo } from "react";
import { Selector } from "src/renderer/shared/ui/Selector";
import { MONTHS } from "src/renderer/shared/config/constants";
import { useAppDispatch, useAppSelector } from "src/renderer/app/providers/store/hooks";
import { setSelectedPeriodKey } from "src/renderer/features/select-month-period";
import { durationMinutes, entryPeriod } from "src/renderer/entities/time-entry";
import { periodKey } from "src/renderer/shared/lib/date";
import { formatMinutes } from "src/renderer/shared/lib/duration";

type PeriodOption = {
  value: string;
  year: number;
  month: number;
};

function currentPeriod(): { year: number; month: number; value: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { year, month, value: periodKey(year, month) };
}

export function MonthPeriodToolbar(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const selectedPeriodKey = useAppSelector(
    (state) => state.monthToolbar.selectedPeriodKey,
  );

  const availablePeriods = useMemo<PeriodOption[]>(() => {
    const current = currentPeriod();
    const values = new Map<string, { year: number; month: number }>();

    data?.entries.forEach((entry) => {
      const period = entryPeriod(entry);
      if (!period) return;
      values.set(periodKey(period.year, period.month), period);
    });

    values.set(current.value, current);

    return [...values.entries()]
      .map(([value, period]) => ({ value, ...period }))
      .sort(
        (left, right) => left.year - right.year || left.month - right.month,
      );
  }, [data?.entries]);

  const selectedPeriod = useMemo(() => {
    const [year, month] = selectedPeriodKey.split("-").map(Number);
    return { year, month };
  }, [selectedPeriodKey]);

  const yearOptions = useMemo(() => {
    const years = [
      ...new Set(availablePeriods.map((period) => period.year)),
    ].sort((left, right) => right - left);
    return years.map((year) => ({
      value: year,
      label: String(year),
    }));
  }, [availablePeriods]);

  const selectedYearPeriods = useMemo(
    () =>
      availablePeriods
        .filter((period) => period.year === selectedPeriod.year)
        .sort((left, right) => left.month - right.month),
    [availablePeriods, selectedPeriod.year],
  );

  const monthOptions = useMemo(
    () =>
      selectedYearPeriods.map((period) => ({
        value: period.month,
        label: MONTHS[period.month - 1],
      })),
    [selectedYearPeriods],
  );

  const visibleMonthEntries = useMemo(
    () =>
      data?.entries.filter((entry) => {
        const period = entryPeriod(entry);
        return (
          period?.year === selectedPeriod.year &&
          period.month === selectedPeriod.month
        );
      }) ?? [],
    [data?.entries, selectedPeriod.month, selectedPeriod.year],
  );

  const monthSummary = useMemo(() => {
    const totalMinutes = visibleMonthEntries.reduce(
      (total, entry) => total + durationMinutes(entry),
      0,
    );
    return `${visibleMonthEntries.length} записей · ${formatMinutes(totalMinutes)}`;
  }, [visibleMonthEntries]);

  useEffect(() => {
    if (!availablePeriods.length) return;
    if (
      !availablePeriods.some((period) => period.value === selectedPeriodKey)
    ) {
      dispatch(setSelectedPeriodKey(currentPeriod().value));
    }
  }, [availablePeriods, dispatch, selectedPeriodKey]);

  const selectYear = (year: number) => {
    const periods = availablePeriods.filter((period) => period.year === year);
    const matchingMonth = periods.find(
      (period) => period.month === selectedPeriod.month,
    );
    const fallback = periods[periods.length - 1];
    const nextMonth =
      matchingMonth?.month ?? fallback?.month ?? selectedPeriod.month;
    dispatch(setSelectedPeriodKey(periodKey(year, nextMonth)));
  };

  const selectMonth = (month: number) => {
    dispatch(setSelectedPeriodKey(periodKey(selectedPeriod.year, month)));
  };

  return (
    <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
      <div className="flex items-end gap-3">
        <Selector
          label="Год"
          value={selectedPeriod.year}
          onChange={(event) => selectYear(Number(event.target.value))}
          options={yearOptions}
        />
        <Selector
          label="Месяц"
          value={selectedPeriod.month}
          onChange={(event) => selectMonth(Number(event.target.value))}
          options={monthOptions}
        />
        <span className="pb-2 text-sm font-semibold text-zinc-500">
          {monthSummary}
        </span>
      </div>
    </section>
  );
}
