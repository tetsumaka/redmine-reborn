import React, { useEffect, useMemo } from "react";
import { Selector } from "src/renderer/components/ui";
import { MONTHS } from "src/renderer/constants";
import { useAppDispatch, useAppSelector } from "src/renderer/store/hooks";
import { setSelectedPeriodKey } from "src/renderer/store/monthToolbarSlice";
import {
  durationMinutes,
  entryPeriod,
  formatMinutes,
  periodKey,
} from "src/renderer/utils";

export function MonthToolbar(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.appData.data);
  const selectedPeriodKey = useAppSelector(
    (state) => state.monthToolbar.selectedPeriodKey,
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

  const monthOptions = useMemo(() => {
    if (availablePeriods.length > 0) {
      return availablePeriods.map((period) => ({
        value: period.value,
        label: period.label,
      }));
    }
    const [year, month] = selectedPeriodKey.split("-").map(Number);
    return [
      {
        value: selectedPeriodKey,
        label: `${MONTHS[month - 1]} ${year}`,
        disabled: true,
      },
    ];
  }, [availablePeriods, selectedPeriodKey]);

  const selectedPeriod = useMemo(() => {
    const [year, month] = selectedPeriodKey.split("-").map(Number);
    return { year, month };
  }, [selectedPeriodKey]);

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
      dispatch(setSelectedPeriodKey(availablePeriods[0].value));
    }
  }, [availablePeriods, dispatch, selectedPeriodKey]);

  return (
    <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
      <div className="flex items-end gap-3">
        <Selector
          label="Период"
          value={selectedPeriodKey}
          onChange={(event) =>
            dispatch(setSelectedPeriodKey(event.target.value))
          }
          options={monthOptions}
          selectClassName="w-[190px]"
        />
        <span className="pb-2 text-sm font-semibold text-zinc-500">
          {monthSummary}
        </span>
      </div>
    </section>
  );
}
