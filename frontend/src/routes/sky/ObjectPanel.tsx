/**
 * ObjectPanel — the payoff of a selection (redesign/routes/02-sky.md §4.4).
 *
 * Plain-first, progressive disclosure: name + one-line type/owner/orbit, a human sentence, four key
 * facts, raw orbit data behind "Show raw data" (expanded by default in Pro), and a single forward
 * CTA. Rendered as a floating glass Card on the globe (desktop) and inside a bottom Sheet on mobile.
 */
import { ArrowRight, CircleOff, Satellite, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Badge,
  Button,
  cn,
  DataRow,
  IconButton,
  RiskBadge,
  ShowDetails,
  Skeleton,
  Stack,
  Term,
  textStyles,
  useMode
} from "../../components/ui";
import {
  ctaFor,
  ownerLabel,
  plainDescription,
  RISK_TEXT_CLASS,
  subLine,
  typeFact,
  type SkyObject
} from "./sky-data";

export interface ObjectPanelProps {
  object: SkyObject;
  /** Protected asset name, woven into the plain sentence. */
  protectedName: string;
  /** Workbench provenance for the Pro lineage line. */
  fetchedAt?: string | null;
  /** Catalog still loading → facts/TLE show skeletons (header shows instantly). */
  factsLoading?: boolean;
  /** Globe (desktop) card shows its own name + close button; the Sheet supplies its own chrome. */
  embedded?: boolean;
  onClose?: () => void;
  className?: string;
}

/** Small class glyph: protected asset, satellite, or debris — colored by risk token. */
export function ClassIcon({ object, compact = false }: { object: SkyObject; compact?: boolean }) {
  const isProtected = object.risk === "safe" && object.kind === "satellite";
  const Icon = object.kind === "debris" ? CircleOff : isProtected ? ShieldCheck : Satellite;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-surface-2",
        compact ? "size-8" : "size-9",
        RISK_TEXT_CLASS[object.risk]
      )}
    >
      <Icon size={compact ? 16 : 18} />
    </span>
  );
}

export function ObjectPanel({
  object,
  protectedName,
  fetchedAt,
  factsLoading = false,
  embedded = false,
  onClose,
  className
}: ObjectPanelProps) {
  const { mode, isPro } = useMode();
  const cta = ctaFor(object);
  const tle = object.catalog?.tle;
  const noradId = object.catalog?.norad_id ?? null;

  return (
    <Stack gap={6} className={className}>
      {/* 1 — header: class icon + name + one plain line; risk badge when in a close approach. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ClassIcon object={object} />
          <Stack gap={1}>
            {embedded ? null : <h2 className={cn(textStyles.h2, "text-strong")}>{object.name}</h2>}
            <p className={cn(textStyles.body, "text-muted")}>{subLine(object, mode)}</p>
          </Stack>
        </div>
        {embedded || !onClose ? null : (
          <IconButton label="Close panel" icon={<X size={20} />} onClick={onClose} className="-mr-2 -mt-1" />
        )}
      </div>

      {object.conjunction ? (
        <div className="flex items-center gap-2">
          <RiskBadge severity={object.conjunction.risk.severity} />
          <span className={cn(textStyles.caption, "text-muted")}>
            in a <Term k="conjunction">close approach</Term>
          </span>
        </div>
      ) : null}

      {/* 2 — the plain sentence. */}
      <p className={cn(textStyles.body, "text-body")}>{plainDescription(object, protectedName)}</p>

      {/* 3 — four key facts. */}
      {factsLoading ? (
        <Stack gap={0}>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center justify-between border-b border-hairline py-3">
              <Skeleton height={14} width={96} />
              <Skeleton height={14} width={72} />
            </div>
          ))}
        </Stack>
      ) : (
        <Stack gap={0}>
          <DataRow
            label={<Term k="norad-id">Catalog number</Term>}
            value={<span className={isPro ? textStyles.mono : undefined}>{noradId ?? "—"}</span>}
          />
          <DataRow label="Type" value={typeFact(object, mode)} />
          <DataRow label="Orbit" value={<Term k="leo">Low orbit</Term>} />
          <DataRow label="Owner" value={ownerLabel(object)} divider={false} />
        </Stack>
      )}

      {/* 4 — raw data: collapsed in Simple, expanded in Pro (Law 4). */}
      <ShowDetails key={mode} label="Show raw data" defaultOpen={isPro}>
        <Stack gap={3}>
          <p className={cn(textStyles.caption, "text-muted")}>
            <Term k="tle">Orbit data</Term> — the standard text describing this object&rsquo;s orbit.
          </p>
          {factsLoading ? (
            <Skeleton height={56} radius="md" />
          ) : tle ? (
            <pre className={cn(textStyles.mono, "overflow-x-auto whitespace-pre rounded-md bg-deep p-3 text-faint")}>
              {tle.line1}
              {"\n"}
              {tle.line2}
            </pre>
          ) : (
            <p className={cn(textStyles.caption, "text-faint")}>Orbit data isn&rsquo;t available for this object.</p>
          )}

          {isPro && object.catalog ? (
            <Stack gap={2} className="border-t border-hairline pt-3">
              <DataRow
                label="Source catalog"
                value={<span className={textStyles.mono}>{object.catalog.source_catalog ?? "—"}</span>}
                divider={false}
              />
              <DataRow
                label="Object id"
                value={<span className={textStyles.mono}>{object.catalog.object_id}</span>}
                divider={false}
              />
              {fetchedAt ? (
                <p className={cn(textStyles.caption, "text-faint")}>
                  Lineage: {object.catalog.source_catalog ?? "fixture"} · fetched {fetchedAt}
                </p>
              ) : null}
              {object.catalog.tags.length ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {object.catalog.tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </ShowDetails>

      {/* 5 — the single forward action. */}
      <Button asChild variant="primary" fullWidth className="glow-cyan">
        <Link to={cta.to}>
          {cta.label}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </Button>
    </Stack>
  );
}
