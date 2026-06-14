/**
 * Orbit trail — a thick, glowing, risk-colored, fading ring drawn with drei
 * `<Line>` (Line2 / LineMaterial), which supports real world/px width unlike
 * the legacy 1px `LineLoop` (doc 07 §5). The danger trail is wider + brighter.
 */
import { useMemo } from "react";
import { Line } from "@react-three/drei";

import { RISK_COLOR } from "./colors";
import { fadeGradient, ringPoints } from "./orbit";
import type { OrbitObject, Risk } from "./types";

type OrbitTrailProps = {
  orbit: OrbitObject["orbit"];
  risk: Risk;
  /** Override color/width (e.g. the amber "after" maneuver path). */
  color?: string;
  /** Extra emphasis for selected/threat trails. */
  emphasized?: boolean;
};

const SEGMENTS = 256;

export function OrbitTrail({ orbit, risk, color, emphasized }: OrbitTrailProps) {
  const baseColor = color ?? RISK_COLOR[risk];
  const points = useMemo(() => ringPoints(orbit, SEGMENTS), [orbit.radius]);
  const vertexColors = useMemo(() => fadeGradient(baseColor, SEGMENTS), [baseColor]);

  const danger = risk === "danger" || emphasized;

  return (
    <Line
      points={points}
      vertexColors={vertexColors}
      lineWidth={danger ? 2.4 : 1.4}
      transparent
      opacity={danger ? 0.95 : 0.55}
      toneMapped={false}
      rotation={[orbit.inclination, orbit.raan, 0]}
    />
  );
}
