import type { TimeEntry } from "src/shared/types";
import { Trash2 } from "lucide-react";
import { formattedDuration } from "src/renderer/entities/time-entry/lib/duration";
import { Button } from "src/renderer/shared/ui/Button";

type TimeEntryRowProps = {
  entry: TimeEntry;
  redmineUrl: string;
  onDelete: (entry: TimeEntry) => void;
};

function empty(value: string | undefined): string {
  return value?.trim() || "-";
}

function issueHref(redmineUrl: string, issueId: string): string {
  const normalizedUrl = /^https?:\/\//.test(redmineUrl)
    ? redmineUrl
    : `https://${redmineUrl}`;
  return `${normalizedUrl.replace(/\/+$/, "")}/issues/${issueId}`;
}

export function TimeEntryRow({
  entry,
  redmineUrl,
  onDelete,
}: TimeEntryRowProps) {
  const canLinkIssue = redmineUrl.trim() && /^\d+$/.test(entry.issueId);

  return (
    <tr className="transition hover:bg-zinc-800/70">
      <td className="h-14 px-4 py-3 align-middle font-mono text-base font-extrabold tabular-nums text-zinc-100">
        {formattedDuration(entry)}
      </td>
      <td className="h-14 px-4 py-3 align-middle text-zinc-200">
        {canLinkIssue ? (
          <a
            className="font-bold text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
            href={issueHref(redmineUrl, entry.issueId)}
            target="_blank"
            rel="noreferrer"
          >
            #{entry.issueId}
          </a>
        ) : (
          <span className="font-bold text-zinc-300">
            {empty(entry.issueId)}
          </span>
        )}
      </td>
      <td className="h-14 px-4 py-3 align-middle text-zinc-200">
        {empty(entry.tracker)}
      </td>
      <td className="h-14 min-w-[220px] px-4 py-3 align-middle text-zinc-200">
        {empty(entry.subject)}
      </td>
      <td className="h-14 px-4 py-3 align-middle text-zinc-200">
        {empty(entry.activity)}
      </td>
      <td className="h-14 min-w-[240px] max-w-[360px] whitespace-normal break-words px-4 py-3 align-middle text-zinc-300">
        {empty(entry.comment)}
      </td>
      <td className="h-14 px-4 py-3 align-middle text-zinc-200">
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${
            entry.synced
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {entry.synced ? "Синхронизировано" : "Не синхронизировано"}
        </span>
      </td>
      <td className="h-14 w-14 px-4 py-3 text-right align-middle text-zinc-200">
        <Button
          icon={<Trash2 size={16} />}
          iconOnly
          variant="danger"
          fill="outline"
          title="Удалить запись"
          ariaLabel="Удалить запись"
          onClick={() => onDelete(entry)}
        />
      </td>
    </tr>
  );
}
