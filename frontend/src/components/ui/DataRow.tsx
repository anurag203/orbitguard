import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import { focusRing, textStyles } from "./styles";

export interface DataRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  /** <InfoDot> after the label. */
  hint?: ReactNode;
  /** Makes the whole row a navigable Router link. */
  href?: string;
  /** OR an interactive row. */
  onSelect?: () => void;
  /** Bottom hairline. */
  divider?: boolean;
}

const BASE = "flex items-center justify-between gap-4 py-3";

export function DataRow({ label, value, hint, href, onSelect, divider = true, className, ...rest }: DataRowProps) {
  const interactive = Boolean(href || onSelect);
  const dividerClass = divider ? "border-b border-hairline" : undefined;

  const body = (
    <>
      <span className={cn(textStyles.body, "inline-flex items-center gap-1.5 text-muted")}>
        {label}
        {hint}
      </span>
      <span className={cn(textStyles.body, "inline-flex items-center gap-2 text-right text-strong")}>
        {value}
        {interactive ? <ChevronRight aria-hidden="true" className="text-faint" size={16} /> : null}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(BASE, "min-h-11 rounded-md px-2 transition hover:bg-surface-2/60 motion-reduce:transition-none", focusRing, dividerClass, className)}
      >
        {body}
      </Link>
    );
  }

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(BASE, "min-h-11 w-full rounded-md px-2 text-left transition hover:bg-surface-2/60 motion-reduce:transition-none", focusRing, dividerClass, className)}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn(BASE, dividerClass, className)} {...rest}>
      {body}
    </div>
  );
}

export interface KeyValueProps {
  label: ReactNode;
  /** The value (ReactNode → can hold <Term>, mono IDs, etc.). */
  children: ReactNode;
  layout?: "row" | "stacked";
  /** Render value in font-mono (Pro IDs / TLE). */
  mono?: boolean;
  className?: string;
}

/** Compact label→value pair for dense fact lists (doc 05 §3). */
export function KeyValue({ label, children, layout = "stacked", mono = false, className }: KeyValueProps) {
  return (
    <div className={cn(layout === "stacked" ? "flex flex-col gap-0.5" : "flex items-baseline justify-between gap-4", className)}>
      <span className={cn(textStyles.caption, "text-muted")}>{label}</span>
      <span className={cn(mono ? textStyles.mono : textStyles.body, "text-strong")}>{children}</span>
    </div>
  );
}
