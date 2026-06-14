/**
 * The Pc model, briefly and honestly (doc 08-system §4.4).
 *
 * A 2–3 line plain explanation of how collision chance is estimated, plus the REAL covariance
 * parameters pulled from a representative conjunction's `pc_estimate` (via `useThreatDetail`) so the
 * model is verifiable rather than asserted. Simple hides the maths behind "Show the math"; Pro
 * opens it by default and shows exact values. The section never blocks: if the live numbers can't
 * load, the approach still renders.
 */

import { cn, KeyValue, ShowDetails, Skeleton, Stack, Term, textStyles, useMode } from "../../components/ui";
import { isApiError, useThreatDetail } from "../../features";
import { formatPc } from "../../lib/format";
import { PC_REFERENCE_CONJUNCTION_ID } from "./config";

/** Bulleted list of model caveats (assumptions / warnings / covariance notes). */
function CaveatList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn(textStyles.eyebrow, "text-faint")}>{label}</span>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className={cn(textStyles.caption, "flex gap-2 text-muted")}>
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PcModel() {
  const { mode, isPro } = useMode();
  const { data, isLoading, isError, error } = useThreatDetail(PC_REFERENCE_CONJUNCTION_ID);
  const estimate = data?.pc_estimate;

  /** Simple rounds; Pro is exact (doc 08-system §6 table). */
  const meters = (value: number) => `${isPro ? value : Math.round(value)} m`;

  return (
    <Stack gap={6}>
      <p className={cn(textStyles.bodyLg, "max-w-[68ch] text-body")}>
        <Term k="pc">Collision chance</Term> is estimated by integrating the position uncertainty in the 2-D encounter
        plane at closest approach, using a <Term k="covariance">margin of error</Term> model and a combined hard-body
        radius. The numbers below are the actual parameters behind a representative close approach — not placeholders.
      </p>

      <ShowDetails label="Show the math" defaultOpen={isPro}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton height={16} width={220} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["pc", "method", "model", "sigma-x", "sigma-y", "radius"].map((field) => (
                <Skeleton key={field} height={42} radius="md" />
              ))}
            </div>
          </div>
        ) : isError || !estimate ? (
          <p className={cn(textStyles.body, "max-w-[68ch] text-muted")}>
            The live model parameters couldn&rsquo;t be loaded right now
            {isApiError(error) ? <span className="text-faint"> ({error.status} {error.code})</span> : null} — the approach
            above still applies, and every estimate ships with its assumptions on display.
          </p>
        ) : (
          <Stack gap={6}>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <KeyValue label="Collision chance (Pc)">{formatPc(estimate.pc, mode)}</KeyValue>
              <KeyValue label="Method" mono>
                {estimate.method}
              </KeyValue>
              <KeyValue label="Covariance model" mono>
                {estimate.covariance.model_id}
              </KeyValue>
              <KeyValue label="σx (cross-track)">{meters(estimate.covariance.sigma_x_m)}</KeyValue>
              <KeyValue label="σy (radial)">{meters(estimate.covariance.sigma_y_m)}</KeyValue>
              <KeyValue label="Hard-body radius">{meters(estimate.covariance.hard_body_radius_m)}</KeyValue>
              <KeyValue label="Source">{estimate.covariance.source}</KeyValue>
            </div>

            <CaveatList label="Covariance notes" items={estimate.covariance.notes} />
            <CaveatList label="Assumptions" items={estimate.assumptions} />
            <CaveatList label="Warnings" items={estimate.warnings} />
          </Stack>
        )}
      </ShowDetails>
    </Stack>
  );
}
