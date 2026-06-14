/**
 * The honest health line (doc 08-system §4.1, §7).
 *
 * One live status sentence from `useDemoStatus()` — never a big "health card". The rest of the
 * route renders without this call; only this line shimmers while loading and degrades gracefully
 * (with a Retry) on error, so the credibility content is always visible.
 */

import { Check, X } from "lucide-react";

import { Badge, Button, LiveChip, ShowDetails, Skeleton, cn, textStyles, useMode } from "../../components/ui";
import { isApiError, useDemoStatus } from "../../features";
import type { DemoStatus } from "../../features";

/** A small static readiness dot — green when ready, amber when something needs attention. */
function ReadinessDot({ ready }: { ready: boolean }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", ready ? "bg-safe" : "bg-warning")} />;
}

function groupByCategory(checks: DemoStatus["checks"]): Array<[string, DemoStatus["checks"]]> {
  const groups = new Map<string, DemoStatus["checks"]>();
  for (const check of checks) {
    const list = groups.get(check.category) ?? [];
    list.push(check);
    groups.set(check.category, list);
  }
  return [...groups.entries()];
}

function categoryLabel(category: string): string {
  return category.replaceAll("-", " ").replaceAll("_", " ");
}

/** The full per-check matrix, grouped by category — behind a disclosure in Simple, open in Pro. */
function ReadinessChecks({ checks, isPro }: { checks: DemoStatus["checks"]; isPro: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {groupByCategory(checks).map(([category, items]) => (
        <div key={category} className="flex flex-col gap-2">
          <p className={cn(textStyles.eyebrow, "text-faint")}>{categoryLabel(category)}</p>
          <ul className="flex flex-col gap-1.5">
            {items.map((check) => {
              const pass = check.status === "pass";
              return (
                <li key={check.name} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                      pass ? "bg-safe/15 text-safe" : "bg-warning/15 text-warning"
                    )}
                  >
                    {pass ? <Check aria-hidden="true" size={11} /> : <X aria-hidden="true" size={11} />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className={cn(textStyles.body, "text-body")}>
                      {check.name}
                      {check.required ? <span className="text-faint"> · required</span> : null}
                    </span>
                    {isPro && check.detail ? <span className={cn(textStyles.caption, "text-muted")}>{check.detail}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SystemHealth() {
  const { isPro } = useMode();
  const { data, isLoading, isError, error, refetch } = useDemoStatus();

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-3">
        <Skeleton width={10} height={10} radius="full" />
        <span className={cn(textStyles.body, "text-muted")}>Checking demo readiness…</span>
        <Skeleton width={140} height={14} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <ReadinessDot ready={false} />
            <span className={cn(textStyles.body, "text-muted")}>Couldn&rsquo;t reach the readiness check.</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
        {isPro && isApiError(error) ? (
          <ShowDetails label="Error detail">
            <pre className={cn(textStyles.mono, "overflow-auto whitespace-pre-wrap rounded-md bg-deep p-3 text-faint")}>
              {`${error.status} ${error.code}: ${error.message}`}
            </pre>
          </ShowDetails>
        ) : null}
      </div>
    );
  }

  const ready = data.status === "ready";
  const requiredTotal = data.checks.filter((check) => check.required).length;
  const requiredPassing = Math.max(0, requiredTotal - data.missing_required_count);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2">
          <ReadinessDot ready={ready} />
          <span className={cn(textStyles.body, "font-medium text-strong")}>{ready ? "Demo ready" : "Needs attention"}</span>
          <span className={cn(textStyles.body, "text-muted")}>
            · {requiredPassing}/{requiredTotal} required checks passing
          </span>
        </span>
        <LiveChip
          live={!data.offline_mode}
          label={data.offline_mode ? "Offline fixture mode" : "Live data"}
          sourceUrl={data.offline_mode ? undefined : "https://celestrak.org"}
        />
        {!ready ? <Badge tone="warning">{data.missing_required_count} to resolve</Badge> : null}
      </div>
      <ShowDetails label="See all readiness checks" defaultOpen={isPro}>
        <ReadinessChecks checks={data.checks} isPro={isPro} />
      </ShowDetails>
    </div>
  );
}
