import { cn } from "../../lib/cn";
import { RISK_FILL, RISK_SOLID, RISK_TEXT, RISK_WORD, toRiskLevel, type RiskLevel } from "../../lib/format";

export interface RiskBadgeProps {
  /** Raw backend severity; mapped via toRiskLevel(). */
  severity?: string;
  /** Use when you already have a canonical level. */
  level?: RiskLevel;
  size?: "sm" | "md" | "lg";
  /** Leading filled dot. */
  showDot?: boolean;
  className?: string;
}

const SIZE = {
  sm: "px-2 py-0.5 text-[12px]",
  md: "px-2.5 py-1 text-[13px]",
  lg: "px-3 py-1.5 text-[15px]"
} as const;

/** The canonical word + color risk chip — the "is this good or bad?" answer (doc 01 §5). */
export function RiskBadge({ severity, level, size = "md", showDot = true, className }: RiskBadgeProps) {
  const resolved: RiskLevel = level ?? toRiskLevel(severity ?? "");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        RISK_FILL[resolved],
        RISK_TEXT[resolved],
        SIZE[size],
        className
      )}
    >
      {showDot ? <span aria-hidden="true" className={cn("inline-block size-1.5 rounded-full", RISK_SOLID[resolved])} /> : null}
      {RISK_WORD[resolved]}
    </span>
  );
}
