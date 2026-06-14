import { ArrowRight, Globe, Radar, type LucideIcon, Rocket, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, cn, focusRing, Row, Stack, textStyles } from "../../components/ui";

/**
 * The "See → Spot → Solve → Prove" story (doc 03 §1, doc 07-learn §4.2) as four plain steps.
 * Each step doubles as gentle navigation to one of the seven real routes — no dead links.
 */
interface HowStep {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  to: string;
  cta: string;
}

const STEPS: HowStep[] = [
  {
    n: 1,
    icon: Globe,
    title: "See",
    body: "We map what's up there — working satellites and old debris — on a live globe.",
    to: "/sky",
    cta: "Explore the sky"
  },
  {
    n: 2,
    icon: Radar,
    title: "Spot",
    body: "We flag when two of them are about to pass too close for comfort.",
    to: "/threats",
    cta: "See the threats"
  },
  {
    n: 3,
    icon: Rocket,
    title: "Solve",
    body: "We find the smallest nudge that opens the gap — safely.",
    to: "/avoidance",
    cta: "Run the safe move"
  },
  {
    n: 4,
    icon: ShieldCheck,
    title: "Prove",
    body: "We double-check the new path, then write down exactly what we did.",
    to: "/report",
    cta: "See a report"
  }
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step) => {
        const Icon = step.icon;
        return (
          <Link key={step.title} to={step.to} className={cn("group block rounded-lg", focusRing)}>
            <Card interactive className="h-full">
              <Stack gap={3} className="h-full">
                <Row justify="between" align="center">
                  <span className="flex size-9 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <span className={cn(textStyles.caption, "text-faint")}>Step {step.n}</span>
                </Row>
                <Stack gap={1}>
                  <h3 className={cn(textStyles.h3, "text-strong")}>{step.title}</h3>
                  <p className={cn(textStyles.body, "text-muted")}>{step.body}</p>
                </Stack>
                <span
                  className={cn(
                    textStyles.label,
                    "mt-auto inline-flex items-center gap-1 text-cyan transition-[gap] group-hover:gap-2"
                  )}
                >
                  {step.cta}
                  <ArrowRight size={14} />
                </span>
              </Stack>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default HowItWorks;
