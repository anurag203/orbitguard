import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/cn";
import {
  formatPc,
  RISK_SOLID,
  RISK_STROKE,
  RISK_TEXT,
  RISK_VALUE,
  RISK_WORD,
  toRiskLevel,
  type RiskLevel
} from "../../lib/format";
import { DURATION, EASE } from "../../lib/motion";
import { useMode } from "./ModeProvider";
import { textStyles } from "./styles";

export interface RiskMeterProps {
  severity: string;
  /** Optional: drives the "1 in N" / sci-notation sub-label. */
  pc?: number;
  /** 0..1 fill; if omitted, derived discretely from level. */
  value?: number;
  variant?: "arc" | "bar";
  size?: "md" | "lg";
  /** Previous value, for the red→green transition. */
  animateFrom?: number;
  className?: string;
}

const ARC_PATH = "M 20 100 A 80 80 0 0 1 180 100";
const SIZE = { md: "w-[180px]", lg: "w-[240px]" } as const;

export function RiskMeter({ severity, pc, value, variant = "arc", size = "md", animateFrom, className }: RiskMeterProps) {
  const reduced = useReducedMotion();
  const { mode } = useMode();
  const level: RiskLevel = toRiskLevel(severity);
  const fill = typeof value === "number" ? value : RISK_VALUE[level];
  const subLabel = typeof pc === "number" ? formatPc(pc, mode) : undefined;
  const ariaLabel = `Collision risk: ${RISK_WORD[level]}`;
  // A pulse when crossing from a worse (higher) value to a better (lower) one.
  const improving = !reduced && typeof animateFrom === "number" && fill < animateFrom;

  if (variant === "bar") {
    return (
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        aria-label={ariaLabel}
        className={cn("flex flex-col gap-2", className)}
      >
        <div className="flex items-baseline justify-between">
          <span className={cn(textStyles.label, RISK_TEXT[level])}>{RISK_WORD[level]}</span>
          {subLabel ? <span className={cn(textStyles.caption, "text-muted")}>{subLabel}</span> : null}
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={cn("h-full rounded-full", RISK_SOLID[level])}
            initial={reduced ? false : { width: `${(animateFrom ?? fill) * 100}%` }}
            animate={{ width: `${fill * 100}%` }}
            transition={{ duration: DURATION.base, ease: EASE }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fill * 100)}
      aria-label={ariaLabel}
      className={cn("relative inline-flex flex-col items-center", SIZE[size], className)}
    >
      <svg viewBox="0 0 200 120" className="w-full" aria-hidden="true">
        <path d={ARC_PATH} fill="none" strokeWidth={12} strokeLinecap="round" className="stroke-hairline" />
        <motion.path
          d={ARC_PATH}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          className={RISK_STROKE[level]}
          initial={reduced ? false : { pathLength: animateFrom ?? fill }}
          animate={{ pathLength: fill }}
          transition={{ duration: DURATION.base, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className={cn(textStyles.h2, RISK_TEXT[level])}>{RISK_WORD[level]}</span>
        {subLabel ? <span className={cn(textStyles.caption, "mt-1 text-center text-muted")}>{subLabel}</span> : null}
      </div>
      {improving ? (
        <motion.span
          aria-hidden="true"
          className="glow-safe pointer-events-none absolute inset-0 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      ) : null}
    </div>
  );
}
