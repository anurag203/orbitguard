import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { RISK_TEXT, type RiskLevel } from "../../lib/format";
import { CountUp } from "./CountUp";
import { textStyles } from "./styles";

export interface StatProps {
  /** Pre-formatted string OR a number to count up. */
  value: ReactNode;
  label: string;
  /** Optional <Term> / <InfoDot>. */
  hint?: ReactNode;
  tone?: "default" | RiskLevel | "cyan";
  size?: "md" | "lg" | "xl";
  countUp?: boolean;
  countTo?: number;
  format?: (n: number) => string;
}

const SIZE = { md: "text-[1.5rem]", lg: "text-[2rem]", xl: "text-[3rem]" } as const;

function toneClass(tone: NonNullable<StatProps["tone"]>): string {
  if (tone === "default") return "text-strong";
  if (tone === "cyan") return "text-cyan";
  return RISK_TEXT[tone];
}

export function Stat({ value, label, hint, tone = "default", size = "md", countUp = false, countTo, format }: StatProps) {
  const showCount = countUp && typeof countTo === "number";
  return (
    <div className="flex flex-col">
      <span className={cn("font-display font-semibold leading-none", SIZE[size], toneClass(tone))}>
        {showCount ? <CountUp to={countTo} format={format} /> : value}
      </span>
      <span className={cn(textStyles.caption, "mt-2 inline-flex items-center gap-1 text-muted")}>
        {label}
        {hint}
      </span>
    </div>
  );
}
