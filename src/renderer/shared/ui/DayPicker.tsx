import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso } from "src/renderer/shared/lib/date";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";

type DayPickerProps = {
  selectedDate: string;
  summary?: string;
  onDateChange: (date: string) => void;
};

export function DayPicker({ selectedDate, summary, onDateChange }: DayPickerProps) {
  return (
    <div className="flex items-end gap-2">
      <Button
        icon={<ChevronLeft size={18} />}
        iconOnly
        fill="outline"
        ariaLabel="Предыдущий день"
        tooltip="Предыдущий день"
        onClick={() => onDateChange(addDaysIso(selectedDate, -1))}
      />
      <div className="w-[160px]">
        <DatePicker value={selectedDate} onDateChange={onDateChange} />
      </div>
      <Button
        icon={<ChevronRight size={18} />}
        iconOnly
        fill="outline"
        ariaLabel="Следующий день"
        tooltip="Следующий день"
        onClick={() => onDateChange(addDaysIso(selectedDate, 1))}
      />
      {summary && (
        <span className="pb-2 pl-2 text-sm font-semibold text-zinc-500">
          {summary}
        </span>
      )}
    </div>
  );
}
