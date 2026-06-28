import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button, DatePicker, Selector, type SelectOption } from "./ui";

type DayToolbarProps = {
  selectedDate: string;
  summary: string;
  syncing: boolean;
  onDateChange: (date: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onSync: () => void;
};

export function DayToolbar(props: DayToolbarProps) {
  return (
    <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
      <div className="flex items-end gap-2">
        <Button
          icon={<ChevronLeft size={18} />}
          iconOnly
          fill="outline"
          aria-label="Предыдущий день"
          title="Предыдущий день"
          onClick={props.onPreviousDay}
        />
        <DatePicker
          label="День"
          value={props.selectedDate}
          onDateChange={props.onDateChange}
          inputClassName="w-[160px]"
        />
        <Button
          icon={<ChevronRight size={18} />}
          iconOnly
          fill="outline"
          aria-label="Следующий день"
          title="Следующий день"
          onClick={props.onNextDay}
        />
        <span className="pb-2 pl-2 text-sm font-semibold text-zinc-500">
          {props.summary}
        </span>
      </div>
      <Button
        variant="primary"
        disabled={props.syncing}
        icon={<RefreshCw size={16} />}
        onClick={props.onSync}
      >
        {props.syncing ? "Синхронизация..." : "Синхронизировать"}
      </Button>
    </section>
  );
}
