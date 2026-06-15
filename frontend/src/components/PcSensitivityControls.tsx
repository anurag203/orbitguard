import { useMemo, useState } from "react";

import { formatPc } from "../lib/format";
import { cn, KeyValue, Stack, textStyles } from "./ui";

type CovarianceLike = {
  sigma_x_m: number;
  sigma_y_m: number;
  hard_body_radius_m: number;
};

export interface PcSensitivityControlsProps {
  pc: number;
  covariance: CovarianceLike;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pro-only Pc sensitivity panel. It is an illustrative scale check, not a replacement for the
 * backend Pc engine: larger bodies and wider uncertainty grow the displayed Pc proportionally.
 */
export function PcSensitivityControls({ pc, covariance }: PcSensitivityControlsProps) {
  const [sigmaScale, setSigmaScale] = useState(1);
  const [radius, setRadius] = useState(covariance.hard_body_radius_m);

  const adjustedPc = useMemo(() => {
    const safeBaseRadius = Math.max(covariance.hard_body_radius_m, 0.1);
    const radiusScale = (radius / safeBaseRadius) ** 2;
    return clamp(pc * sigmaScale * radiusScale, 0, 1);
  }, [covariance.hard_body_radius_m, pc, radius, sigmaScale]);

  return (
    <Stack gap={4} className="rounded-lg border border-hairline bg-surface/40 p-4">
      <div className="flex flex-col gap-1">
        <p className={cn(textStyles.eyebrow, "text-muted")}>Pc sensitivity</p>
        <p className={cn(textStyles.caption, "text-faint")}>
          Pro scale check only: adjust uncertainty and hard-body radius to see how the displayed collision chance moves.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={cn(textStyles.caption, "text-muted")}>Uncertainty scale · {sigmaScale.toFixed(1)}x</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={sigmaScale}
            onChange={(event) => setSigmaScale(Number(event.target.value))}
            className="accent-cyan"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={cn(textStyles.caption, "text-muted")}>Hard-body radius · {radius.toFixed(1)} m</span>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="accent-cyan"
          />
        </label>
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <KeyValue label="Base Pc">{formatPc(pc, "pro")}</KeyValue>
        <KeyValue label="Adjusted Pc">{formatPc(adjustedPc, "pro")}</KeyValue>
        <KeyValue label="Sigma x / y">
          {(covariance.sigma_x_m * sigmaScale).toFixed(1)} m / {(covariance.sigma_y_m * sigmaScale).toFixed(1)} m
        </KeyValue>
      </div>
    </Stack>
  );
}
