import { ArrowUpRight, BookOpen, Crosshair, FileText, Globe2, Rocket, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Section, Surface, cn, focusRing, textStyles } from "../../components/ui";

type Chapter = { to: string; title: string; line: string; Icon: LucideIcon };

/**
 * The journey chapters as quiet links (See → Spot → Solve → Prove + Learn). These live BELOW the
 * fold — the spec explicitly moves the workflow grid here so it never competes with the hero (spec
 * §1 anti-goal). No glow: the hero CTA stays the only accent action (doc 02 §1.4).
 */
const CHAPTERS: Chapter[] = [
  { to: "/sky", title: "Explore the sky", line: "See what\u2019s in orbit right now.", Icon: Globe2 },
  { to: "/threats", title: "See the threats", line: "Close approaches, ranked in plain words.", Icon: Crosshair },
  { to: "/avoidance", title: "Find the safe move", line: "Run the scan and clear the risk.", Icon: Rocket },
  { to: "/report", title: "Read the briefing", line: "The audit trail \u2014 exportable.", Icon: FileText },
  { to: "/learn", title: "Learn the basics", line: "How orbital safety actually works.", Icon: BookOpen }
];

export function ExploreChapters() {
  return (
    <Section title="Follow the story" description="See, spot, solve, prove. Jump in anywhere.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHAPTERS.map(({ to, title, line, Icon }) => (
          <Link key={to} to={to} className={cn("group block h-full rounded-lg", focusRing)}>
            <Surface interactive elevation="surface" padding={6} className="flex h-full items-start gap-4">
              <Icon size={22} className="mt-0.5 shrink-0 text-cyan" aria-hidden="true" />
              <span className="flex flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <span className={cn(textStyles.h3, "text-strong")}>{title}</span>
                  <ArrowUpRight
                    size={16}
                    aria-hidden="true"
                    className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
                <span className={cn(textStyles.body, "text-muted")}>{line}</span>
              </span>
            </Surface>
          </Link>
        ))}
      </div>
    </Section>
  );
}
