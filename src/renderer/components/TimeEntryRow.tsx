import { Trash2 } from "lucide-react";
import type { Entry } from "../types";
import { formattedDuration } from "../utils";
import { TableCell, TableRow, cn } from "./ui";
import { Button } from "../shared/ui/Button";

type TimeEntryRowProps = {
  entry: Entry;
  redmineUrl: string;
  onDelete: (entry: Entry) => void;
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
    <TableRow>
      <TableCell className="font-mono text-base font-extrabold tabular-nums text-zinc-100">
        {formattedDuration(entry)}
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>{empty(entry.tracker)}</TableCell>
      <TableCell className="min-w-[220px]">{empty(entry.subject)}</TableCell>
      <TableCell>{empty(entry.activity)}</TableCell>
      <TableCell className="min-w-[240px] max-w-[360px] whitespace-normal break-words text-zinc-300">
        {empty(entry.comment)}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold",
            entry.synced
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200",
          )}
        >
          {entry.synced ? "Синхронизировано" : "Не синхронизировано"}
        </span>
      </TableCell>
      <TableCell className="w-14 text-right">
        <Button
          icon={<Trash2 size={16} />}
          iconOnly
          fill="outline"
          title="Удалить запись"
          aria-label="Удалить запись"
          onClick={() => onDelete(entry)}
          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
        />
      </TableCell>
    </TableRow>
  );
}
