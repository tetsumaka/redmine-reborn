import { RefreshCw, UploadCloud } from "lucide-react";
import { DayPicker } from "src/shared/ui/DayPicker";
import { DropdownMenu } from "src/shared/ui/DropdownMenu";

type DayToolbarProps = {
  selectedDate: string; summary: string; syncing: boolean;
  onDateChange: (date: string) => void;
  onPullDay: () => void; onPullMonth: () => void;
  onOverwriteDay: () => void; onSendDay: () => void;
};

export function DayToolbar(props: DayToolbarProps) {
  return <section className="mb-4 flex shrink-0 items-end justify-between gap-5">
    <DayPicker selectedDate={props.selectedDate} onDateChange={props.onDateChange} summary={props.summary} />
    <div className="flex items-center gap-2">
      <DropdownMenu label={props.syncing ? "Обновление…" : "Обновить из Redmine"} icon={<RefreshCw size={16} />} disabled={props.syncing} items={[
        { label: "Обновить выбранный день", description: "Загрузить записи дня, сохранив локальные несинхронизированные записи.", onSelect: props.onPullDay },
        { label: "Обновить месяц", description: "Загрузить записи за месяц выбранного дня, сохранив локальные черновики.", onSelect: props.onPullMonth },
      ]} />
      <DropdownMenu label="Отправить в Redmine" icon={<UploadCloud size={16} />} disabled={props.syncing} items={[
        { label: "Только новые записи", description: "Отправить несинхронизированные записи выбранного дня.", onSelect: props.onSendDay },
        { label: "Перезаписать все записи", description: "Удалить все записи дня в Redmine и отправить все записи из таблицы.", onSelect: props.onOverwriteDay, danger: true },
      ]} />
    </div>
  </section>;
}
