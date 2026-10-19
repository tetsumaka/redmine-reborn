import { useMemo } from "react";
import { ProductivityOverview } from "src/renderer/widgets/productivity-overview";
import { useAppSelector } from "src/renderer/app/providers/store/hooks";
import { MonthPeriodToolbar } from "src/renderer/widgets/month-period-toolbar";
import { entryPeriod } from "src/renderer/entities/time-entry";

export function DashboardPage(): React.JSX.Element {
  const data = useAppSelector((state) => state.appData.data);
  const selectedPeriodKey = useAppSelector(
    (state) => state.monthToolbar.selectedPeriodKey,
  );

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MonthPeriodToolbar />
      <div className="min-h-0 flex-1 overflow-auto">
        <ProductivityOverview entries={visibleMonthEntries} />
      </div>
    </div>
  );
}
