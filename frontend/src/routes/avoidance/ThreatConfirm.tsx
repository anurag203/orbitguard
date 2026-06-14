/**
 * ThreatConfirm — step 1 of the flow: confirm (or change) which close approach we're dodging.
 *
 * Shows a compact summary of the selected conjunction (protected ↔ threat, risk, time, gap). When
 * the scenario has more than one ranked close approach, a quiet "Change" opens a Dialog listing
 * them (from `useThreats`) so the operator can pick a different one before planning.
 */

import { Repeat } from "lucide-react";
import { useState } from "react";

import { Button, Card, DataRow, Dialog, RiskBadge, Row, Term, cn, textStyles, useMode } from "../../components/ui";
import type { ConjunctionDetail, ConjunctionSummary } from "../../features";
import { formatDistance, formatTime } from "../../lib/format";

export interface ThreatConfirmProps {
  detail: ConjunctionDetail;
  primaryName: string;
  threats: ConjunctionSummary[];
  selectedId: string;
  onSelect: (conjunctionId: string) => void;
  /** Once planning has started the threat is locked in (no swapping mid-decision). */
  locked: boolean;
}

export function ThreatConfirm({ detail, primaryName, threats, selectedId, onSelect, locked }: ThreatConfirmProps) {
  const { mode } = useMode();
  const [open, setOpen] = useState(false);
  const canChange = !locked && threats.length > 1;

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <Card padding={4} className="flex flex-col gap-3">
      <Row justify="between" align="start" gap={3}>
        <div className="flex flex-col gap-1">
          <span className={cn(textStyles.caption, "text-muted")}>
            Dodging this <Term k="conjunction">close approach</Term>
          </span>
          <span className={cn(textStyles.body, "text-strong")}>
            {primaryName} <span className="text-faint">↔</span> {detail.secondary_object_id}
          </span>
        </div>
        <RiskBadge severity={detail.risk.severity} size="md" />
      </Row>

      <Row gap={6} wrap className="text-muted">
        <span className={textStyles.caption}>
          <Term k="tca" as="static">
            Closest approach
          </Term>
          : <span className="text-body">{formatTime(detail.tca_utc, mode)}</span>
        </span>
        <span className={textStyles.caption}>
          <Term k="miss-distance">Gap</Term>:{" "}
          <span className="text-body">{formatDistance(detail.risk.miss_distance_m, mode, { comparison: true })}</span>
        </span>
      </Row>

      {canChange ? (
        <>
          <Button variant="ghost" size="sm" iconLeft={<Repeat size={16} />} className="self-start" onClick={() => setOpen(true)}>
            Change threat
          </Button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Pick a close approach"
            description="Choose which threat to plan a safe move for."
          >
            <div className="flex flex-col">
              {threats.map((threat) => (
                <DataRow
                  key={threat.conjunction_id}
                  onSelect={() => pick(threat.conjunction_id)}
                  label={
                    <span className="inline-flex items-center gap-2">
                      <RiskBadge severity={threat.risk.severity} size="sm" />
                      <span className={threat.conjunction_id === selectedId ? "text-strong" : undefined}>
                        vs {threat.secondary_object_id}
                      </span>
                    </span>
                  }
                  value={formatDistance(threat.risk.miss_distance_m, mode)}
                />
              ))}
            </div>
          </Dialog>
        </>
      ) : null}
    </Card>
  );
}
