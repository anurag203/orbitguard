import { Radar, Satellite, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { Section } from "../../components/ui/Section";
import { textStyles } from "../../components/ui/styles";

type Step = { n: string; title: string; line: string; Icon: LucideIcon };

/** The See → Spot → Solve story, compressed (spec §4.3). Plain words; not links, not glowing cards. */
const STEPS: Step[] = [
  { n: "01", title: "Watch", line: "We track what\u2019s up there.", Icon: Satellite },
  { n: "02", title: "Spot", line: "We flag when two get dangerously close.", Icon: Radar },
  { n: "03", title: "Clear", line: "We find the one tiny nudge that avoids it.", Icon: Sparkles }
];

export function HowItWorks() {
  return (
    <Section title="How it works" spacing="lg">
      <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
        {STEPS.map(({ n, title, line, Icon }) => (
          <li key={n} className="flex flex-col gap-2">
            <span className={cn(textStyles.mono, "text-faint")}>{n}</span>
            <span className="flex items-center gap-2">
              <Icon size={20} className="text-cyan" aria-hidden="true" />
              <span className={cn(textStyles.h3, "text-strong")}>{title}</span>
            </span>
            <p className={cn(textStyles.body, "text-muted")}>{line}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
