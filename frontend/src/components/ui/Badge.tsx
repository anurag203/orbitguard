import { X } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import type { RiskLevel } from "../../lib/format";
import { focusRing } from "./styles";

export type BadgeTone = "neutral" | "cyan" | "violet" | RiskLevel;

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  cyan: "bg-cyan/15 text-cyan",
  violet: "bg-violet/15 text-violet",
  safe: "bg-safe/15 text-safe",
  watch: "bg-watch/15 text-watch",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger"
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  icon?: ReactNode;
}

const BADGE_SIZE = { sm: "px-2 py-0.5 text-[12px]", md: "px-2.5 py-1 text-[13px]" } as const;

/** Tiny static status/category label (doc 05 §3). Non-interactive. */
export function Badge({ tone = "neutral", size = "sm", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full font-medium", TONE[tone], BADGE_SIZE[size], className)}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: BadgeTone;
  /** Shows a small ✕ when provided. */
  onRemove?: () => void;
}

/** The interactive sibling of Badge — filter chips / toggleable tags (doc 05 §3). */
export const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill(
  { selected = false, tone = "cyan", onRemove, type, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition",
        "active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none",
        focusRing,
        selected ? TONE[tone] : "bg-surface-2 text-muted hover:text-strong",
        className
      )}
      {...rest}
    >
      {children}
      {onRemove ? (
        <span
          aria-hidden="true"
          className="-mr-1 inline-flex size-4 items-center justify-center rounded-full hover:bg-strong/10"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X size={12} />
        </span>
      ) : null}
    </button>
  );
});
