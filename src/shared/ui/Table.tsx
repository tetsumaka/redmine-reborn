import { Fragment, type ReactNode } from "react";

type HeaderItem = {
  key: string;
  component: ReactNode;
};

type RowItem = {
  key: string;
  component: ReactNode;
};

type TableProps = {
  headers: HeaderItem[];
  rows: RowItem[];
  emptyState: ReactNode;
  variant?: "default" | "embedded";
  minWidth?: number;
};

export function Table({
  headers,
  rows,
  emptyState,
  variant = "default",
  minWidth = 1180,
}: TableProps) {
  const containerStyles =
    variant === "embedded"
      ? "flex min-h-0 flex-1 flex-col overflow-hidden border-t border-zinc-800"
      : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/25";

  return (
    <div className={containerStyles}>
      <div
        className={`
          min-h-0 overflow-auto
          ${rows.length > 0 ? "flex-1" : "shrink-0"}
        `}
      >
        <table
          style={{ minWidth }}
          className={`
            w-full border-separate border-spacing-0
            text-left text-sm
          `}
        >
          <thead className="sticky top-0 z-10 bg-zinc-800 text-[11px] uppercase text-zinc-400">
            <tr className="transition hover:bg-zinc-800/70">
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={`
                    h-9 whitespace-nowrap px-3 py-2 font-extrabold
                    tracking-wide
                  `}
                >
                  {header.component}
                </th>
              ))}
            </tr>
          </thead>
          {rows.length > 0 && (
            <tbody className="divide-y divide-zinc-800">
              {rows.map((row) => (
                <Fragment key={row.key}>{row.component}</Fragment>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {rows.length === 0 && emptyState}
    </div>
  );
}
