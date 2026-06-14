import { Car, Eye, Gauge, type LucideIcon, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, cn, Row, Stack, Term, textStyles } from "../../components/ui";

/**
 * The signature friendly bit (doc 07-learn §4.3): each jargon figure paired with an everyday
 * comparison. Numbers match the canonical Protect ISRO demo so they line up with what judges saw.
 * The "× a rifle bullet" speed comparison is allowed ONLY here, per doc 03 §6.
 */
interface Analogy {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  tag?: string;
}

const ANALOGIES: Analogy[] = [
  {
    icon: Car,
    title: "Two cars, same lane",
    body: (
      <>
        “600 metres apart” sounds far — but each object is moving about{" "}
        <strong className="font-semibold text-strong">7.6 km every second</strong>. It's like two cars drifting
        into the same lane at 27,000 km/h, where even a <Term k="miss-distance">tiny gap</Term> is alarming.
      </>
    )
  },
  {
    icon: Gauge,
    title: "A feather-light tap",
    body: (
      <>
        A <Term k="delta-v">0.12 m/s nudge</Term> is a gentle tap on the gas, made hours early. The satellite
        arrives a moment later than it would have — and the danger simply passes by.
      </>
    )
  },
  {
    icon: Eye,
    title: "Check every mirror",
    body: (
      <>
        The <Term k="secondary-screening">double-check</Term> is the glance in every mirror after you change
        lanes: making sure the new path isn't about to surprise something else.
      </>
    )
  },
  {
    icon: Zap,
    title: "Faster than a bullet",
    tag: "Learn only",
    body: (
      <>
        At a <Term k="relative-velocity">closing speed</Term> of about{" "}
        <strong className="font-semibold text-strong">14.7 km/s</strong>, the two objects approach roughly 15×
        faster than a rifle bullet — which is why even a few hundred metres vanishes in a heartbeat.
      </>
    )
  }
];

export function Analogies() {
  return (
    <Stack gap={4}>
      {ANALOGIES.map((analogy) => {
        const Icon = analogy.icon;
        return (
          <Card key={analogy.title}>
            <Row gap={4} align="start">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet/15 text-violet">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <Stack gap={1}>
                <Row gap={2} align="center" wrap>
                  <h3 className={cn(textStyles.h3, "text-strong")}>{analogy.title}</h3>
                  {analogy.tag ? <Badge tone="violet">{analogy.tag}</Badge> : null}
                </Row>
                <p className={cn(textStyles.bodyLg, "text-body")}>{analogy.body}</p>
              </Stack>
            </Row>
          </Card>
        );
      })}
    </Stack>
  );
}

export default Analogies;
