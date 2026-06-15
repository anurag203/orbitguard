/**
 * DoubleCheckPanel — the Trust beat (doc 05 §4.6).
 *
 * After the move is applied, this reveals ~600ms later (no button — the product does it for you),
 * a check mark drawing in, then the "all clear" summary from the secondary screening. While the
 * apply mutation is in flight it shows a calm inline "double-checking…" status.
 *
 * Honesty rule (doc 05 §7): for non-Protect-ISRO scenarios the backend `apply` still echoes the
 * ISRO screen, so we surface a muted chip rather than silently presenting ISRO numbers elsewhere.
 */

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Badge, Card, Skeleton, Term, cn, textStyles } from "../../components/ui";
import type { ManeuverApply } from "../../features";
import { DURATION, EASE } from "../../lib/motion";

export interface DoubleCheckPanelProps {
  apply?: ManeuverApply;
  pending: boolean;
  primaryName: string;
  scenarioId: string;
}

function StatusMark({ reduced, tone }: { reduced: boolean; tone: "safe" | "warning" }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        tone === "safe" ? "bg-safe/15 text-safe" : "bg-warning/15 text-warning"
      )}
    >
      {tone === "safe" ? (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
          <motion.path
            d="M5 12.5l4 4L19 7"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE, delay: reduced ? 0 : 0.1 }}
          />
        </svg>
      ) : (
        <AlertTriangle aria-hidden="true" size={18} strokeWidth={2.25} />
      )}
    </span>
  );
}

export function DoubleCheckPanel({ apply, pending, primaryName, scenarioId }: DoubleCheckPanelProps) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!apply) {
      setRevealed(false);
      return;
    }
    if (reduced) {
      setRevealed(true);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, [apply, reduced]);

  if (pending) {
    return (
      <Card className="flex items-center gap-3">
        <Skeleton width={32} height={32} radius="full" />
        <div className="flex flex-col gap-1">
          <span className={cn(textStyles.body, "text-body")}>
            Double-checking the new path against everything else we track…
          </span>
          <span className={cn(textStyles.caption, "text-muted")}>
            Screening the post-move path for any fresh close approaches.
          </span>
        </div>
      </Card>
    );
  }

  if (!apply || !revealed) return null;

  const concerns = apply.secondary?.concerns?.length ?? 0;
  const status = (apply.secondary_status ?? "").toLowerCase();
  const screened = apply.screened_object_count;
  const incomplete = status === "warning" && screened === 0;
  const clear = !incomplete && concerns === 0 && status !== "warning" && status !== "danger";
  const isIsro = scenarioId === "protect-isro";

  let summary: ReactNode;
  if (incomplete) {
    summary = (
      <>
        This build has not independently re-screened {primaryName}'s post-move path for this scenario.{" "}
        {apply.secondary_summary}
      </>
    );
  } else if (clear) {
    summary = (
      <>
        The nudge doesn't bring {primaryName} near anything else we track —{" "}
        <span className="text-strong">{screened.toLocaleString()} objects</span> screened, all clear.
      </>
    );
  } else {
    summary = apply.secondary_summary || `${concerns} new close approach(es) to review after the move.`;
  }

  return (
    <motion.div
      data-testid="secondary-check"
      data-status={clear ? "clear" : "warning"}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE }}
    >
      <Card glow={clear ? "safe" : "none"} className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <StatusMark reduced={Boolean(reduced)} tone={clear ? "safe" : "warning"} />
          <div className="flex flex-col gap-1">
            <span className={cn(textStyles.h3, "text-strong")}>
              {incomplete ? (
                <>Secondary screening is not complete for this scenario.</>
              ) : (
                <>
                  We <Term k="secondary-screening">double-checked</Term> the new path.
                </>
              )}
            </span>
            <p className={cn(textStyles.body, "text-muted")}>{summary}</p>
          </div>
        </div>
        {!isIsro ? (
          <Badge tone="neutral" className="self-start">
            {incomplete
              ? "No per-scenario secondary fixture is available yet; this run is not marked clear."
              : "Per-scenario secondary screening is still being expanded beyond the Protect ISRO demo."}
          </Badge>
        ) : null}
      </Card>
    </motion.div>
  );
}
