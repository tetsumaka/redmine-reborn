import type { ReactNode } from "react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  fill?: "fill" | "outline";
  icon?: ReactNode;
  iconOnly?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  tooltip?: string;
  title?: string;
  ariaLabel?: string;
  ariaHasPopup?: boolean | "dialog" | "menu" | "grid" | "listbox" | "tree";
  ariaExpanded?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}

export function Button({
  onClick,
  variant = "secondary",
  fill = "fill",
  icon,
  iconOnly = false,
  children,
  type = "button",
  tooltip,
  title,
  disabled,
  ariaLabel,
  ariaHasPopup,
  ariaExpanded,
}: ButtonProps) {
  const baseStyles =
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500/35 disabled:cursor-not-allowed disabled:opacity-55";
  const filledStyles =
    variant === "primary"
      ? "border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-950/30 hover:bg-sky-500"
      : variant === "danger"
        ? "border-red-500 bg-red-600 text-white shadow-lg shadow-red-950/30 hover:bg-red-500"
        : "border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-700";
  const outlinedStyles =
    variant === "primary"
      ? "border-sky-500/70 bg-transparent text-sky-200 hover:bg-sky-500/10"
      : variant === "danger"
        ? "border-red-500/70 bg-transparent text-red-200 hover:bg-red-500/10"
        : "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800";

  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      title={title ?? tooltip}
      aria-label={ariaLabel}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
      className={`${baseStyles} ${fill === "fill" ? filledStyles : outlinedStyles} ${iconOnly ? "w-10 px-0" : ""}`}
    >
      {icon && (
        <span className="flex size-4 items-center justify-center">{icon}</span>
      )}
      {!iconOnly && children}
    </button>
  );
}
