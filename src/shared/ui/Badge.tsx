import type { ReactNode } from "react";

export type BadgeColor = "neutral" | "blue" | "yellow" | "orange" | "coral" | "red";

type BadgeProps = {
  children: ReactNode;
  color?: BadgeColor;
};

const colors: Record<BadgeColor, string> = {
  neutral: "bg-zinc-500/15 text-zinc-300",
  blue: "bg-sky-500/15 text-sky-300",
  yellow: "bg-yellow-500/15 text-yellow-300",
  orange: "bg-orange-500/15 text-orange-300",
  coral: "bg-[#ff7043]/15 text-[#ff8a65]",
  red: "bg-red-500/15 text-red-400",
};

export function Badge({ children, color = "neutral" }: BadgeProps) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-sm font-bold tabular-nums ${colors[color]}`}>
      {children}
    </span>
  );
}
