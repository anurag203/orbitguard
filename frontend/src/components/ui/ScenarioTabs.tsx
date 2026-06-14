import { Badge } from "./Badge";
import { Tabs } from "./Tabs";

export type ScenarioId = "protect-isro" | "2009-replay" | "kessler-sandbox";

export interface ScenarioTabsProps {
  value: ScenarioId;
  onValueChange: (id: ScenarioId) => void;
  /** Optional: loaded ScenarioSummary[] to render titles/modes from data. */
  scenarios?: { scenario_id: string; title: string; mode: string; hero?: boolean }[];
}

// Fixed order: Protect ISRO → 2009 Replay → Kessler (doc 05 §5).
const DEFAULTS: { id: ScenarioId; title: string; hero?: boolean }[] = [
  { id: "protect-isro", title: "Protect ISRO", hero: true },
  { id: "2009-replay", title: "2009 Collision" },
  { id: "kessler-sandbox", title: "Kessler" }
];

/** The scenario switcher that drives the journey (doc 03 §4). A preset over segmented Tabs. */
export function ScenarioTabs({ value, onValueChange, scenarios }: ScenarioTabsProps) {
  const items = DEFAULTS.map((scenario) => {
    const loaded = scenarios?.find((entry) => entry.scenario_id === scenario.id);
    const title = loaded?.title ?? scenario.title;
    return {
      value: scenario.id,
      label: scenario.hero ? (
        <span className="inline-flex items-center gap-1.5">
          {title}
          <Badge tone="cyan" size="sm">
            Hero
          </Badge>
        </span>
      ) : (
        title
      )
    };
  });

  return (
    <Tabs variant="segmented" items={items} value={value} onValueChange={(next) => onValueChange(next as ScenarioId)} />
  );
}
