import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, cn, focusRing, RiskBadge, Term, textStyles, useMode } from "../../components/ui";
import type { ConjunctionSummary } from "../../features";
import { EASE } from "../../lib/motion";
import { formatDistance, formatPc, formatPcPro, formatSpeed, formatTime, toRiskLevel } from "../../lib/format";
import { capitalize, objectPhrase, tcaIso, threatSentence } from "./threats.lib";

export interface ThreatRowProps {
  conjunction: ConjunctionSummary;
  /** The #1 threat — larger, raised, and (when dangerous) softly glowing. */
  emphasis?: boolean;
  /** Destination for the whole-card link. */
  to: string;
}

/** A one-time danger glow that draws the eye to the worst row, then holds steady (doc 03 §8). */
function LeadPulse() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="glow-danger pointer-events-none absolute inset-0 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.85, 0] }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
    />
  );
}

/** Pro-only compact figure cluster: exact miss · Pc · closing speed · TCA · id (doc 03 §6). */
function ProFigures({ conjunction }: { conjunction: ConjunctionSummary }) {
  const { risk, conjunction_id } = conjunction;
  const chips = [
    formatDistance(risk.miss_distance_m, "pro"),
    `Pc ${formatPcPro(risk.pc)}`,
    formatSpeed(risk.relative_velocity_km_s, "pro"),
    formatTime(tcaIso(conjunction), "pro")
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {chips.map((chip) => (
        <span key={chip} className="font-mono text-[0.75rem] text-muted">
          {chip}
        </span>
      ))}
      <span className="font-mono text-[0.75rem] text-faint">{conjunction_id}</span>
    </div>
  );
}

/**
 * One ranked close approach, rendered as a single plain sentence (doc 03 §4.3).
 * The whole card is the link to `/threats/:id`; the RiskBadge is the only color.
 */
export function ThreatRow({ conjunction, emphasis = false, to }: ThreatRowProps) {
  const { mode, isPro } = useMode();
  const level = toRiskLevel(conjunction.risk.severity);
  const sentence = threatSentence(conjunction, mode);
  // The protected asset wears the cyan/safe accent; the RiskBadge keeps the danger colour for the
  // *encounter* (plan 04 §4) — red never lands on the satellite we're keeping safe.
  const protectedLabel = capitalize(objectPhrase(conjunction.primary_object_id));

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg bg-surface p-5 text-left shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition",
        "hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "sm:flex-row sm:items-start sm:gap-5",
        focusRing,
        emphasis && "bg-surface-2 sm:p-6",
        emphasis && level === "danger" && "glow-danger"
      )}
    >
      {emphasis && level === "danger" ? <LeadPulse /> : null}

      <span className="relative flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-start">
        <RiskBadge severity={conjunction.risk.severity} size={emphasis ? "md" : "sm"} />
        <Badge tone="cyan" size="sm" icon={<ShieldCheck aria-hidden="true" size={12} />} className="max-w-full">
          <span className="truncate">{protectedLabel}</span>
        </Badge>
      </span>

      <span className="relative min-w-0 flex-1">
        <span className={cn(emphasis ? textStyles.bodyLg : textStyles.body, "block text-strong")}>{sentence}</span>
        <span className={cn(textStyles.caption, "mt-1.5 block text-muted")}>
          <Term k="pc" as="static">
            collision chance
          </Term>
          : {formatPc(conjunction.risk.pc, mode)}
        </span>
        {isPro ? <ProFigures conjunction={conjunction} /> : null}
      </span>

      <span
        className={cn(
          textStyles.label,
          "relative mt-1 inline-flex shrink-0 items-center gap-1 self-end text-muted transition-colors",
          "group-hover:text-strong group-focus-visible:text-strong sm:self-start"
        )}
      >
        Open
        <ArrowRight
          aria-hidden="true"
          size={16}
          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}
