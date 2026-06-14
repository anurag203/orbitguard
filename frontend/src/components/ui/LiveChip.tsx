import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/cn";
import { livePulse } from "../../lib/motion";
import { focusRing } from "./styles";

export interface LiveChipProps {
  /** true → "Live data" (cyan, pulsing dot); false → offline (muted). */
  live: boolean;
  label?: string;
  /** Optional → chip links out (e.g. CelesTrak). */
  sourceUrl?: string;
  className?: string;
}

/** States data provenance near the relevant content (doc 03 §5). The words carry the meaning. */
export function LiveChip({ live, label, sourceUrl, className }: LiveChipProps) {
  const reduced = useReducedMotion();
  const text = label ?? (live ? "Live data" : "Offline demo data");
  const chipClass = cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
    live ? "bg-cyan/15 text-cyan" : "bg-surface-2 text-muted",
    className
  );

  const dot =
    live && !reduced ? (
      <motion.span aria-hidden="true" variants={livePulse} animate="pulse" className="size-1.5 rounded-full bg-cyan" />
    ) : (
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", live ? "bg-cyan" : "bg-muted")} />
    );

  if (sourceUrl) {
    return (
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={cn(chipClass, "rounded-full", focusRing)}>
        {dot}
        {text}
      </a>
    );
  }

  return (
    <span className={chipClass}>
      {dot}
      {text}
    </span>
  );
}
