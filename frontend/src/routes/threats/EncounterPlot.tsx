import { cn, textStyles } from "../../components/ui";
import type { ConjunctionDetail } from "../../features";

type EncounterPoint = ConjunctionDetail["encounter_plane"][number];

export interface EncounterPlotProps {
  points: EncounterPoint[];
  className?: string;
}

const WIDTH = 260;
const HEIGHT = 150;
const PAD = 26;

/** Clean a raw encounter label ("cosmos-2251-demo") into something readable. */
function cleanLabel(label: string): string {
  return label.replace(/[-_]+/g, " ").replace(/\bdemo\b/gi, "").replace(/\s+/g, " ").trim() || label;
}

/**
 * A tiny encounter-plane scatter (Pro disclosure, doc 04 §4.6 / §6). Plots the two
 * objects at the close moment and the gap between them — honest geometry, not decoration.
 * Token-colored only; renders statically (no animation needed for a static chart).
 */
export function EncounterPlot({ points, className }: EncounterPlotProps) {
  if (!points || points.length < 2) {
    return <p className={cn(textStyles.caption, "text-faint", className)}>Encounter geometry is unavailable for this approach.</p>;
  }

  const xs = points.map((point) => point.x_m);
  const ys = points.map((point) => point.y_m);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  const toX = (value: number) => PAD + ((value - minX) / spanX) * (WIDTH - PAD * 2);
  // Invert Y so positive metres read "up".
  const toY = (value: number) => HEIGHT - PAD - ((value - minY) / spanY) * (HEIGHT - PAD * 2);

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-[340px]"
        role="img"
        aria-label="Encounter plane showing the two objects and the gap between them."
      >
        <line x1={PAD} y1={HEIGHT / 2} x2={WIDTH - PAD} y2={HEIGHT / 2} className="stroke-hairline" strokeWidth={1} />
        <line x1={WIDTH / 2} y1={PAD} x2={WIDTH / 2} y2={HEIGHT - PAD} className="stroke-hairline" strokeWidth={1} />

        {/* The miss-distance connector between the first two objects. */}
        <line
          x1={toX(points[0].x_m)}
          y1={toY(points[0].y_m)}
          x2={toX(points[1].x_m)}
          y2={toY(points[1].y_m)}
          className="stroke-danger"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={toX(point.x_m)} cy={toY(point.y_m)} r={index === 0 ? 5 : 4} className={index === 0 ? "fill-cyan" : "fill-danger"} />
            <text
              x={toX(point.x_m)}
              y={toY(point.y_m) - 9}
              textAnchor="middle"
              className="fill-muted font-mono text-[8px]"
            >
              {cleanLabel(point.label)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={cn(textStyles.caption, "mt-1 text-faint")}>Encounter plane (metres). Dashed line = closest approach.</figcaption>
    </figure>
  );
}
