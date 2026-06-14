import { useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowRight, ChevronRight, Info } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button, cn, focusRing, PageHeader, Row, Section, Stack, Surface, Term, textStyles } from "../../components/ui";
import { Analogies } from "./Analogies";
import { Glossary } from "./Glossary";
import { HowItWorks } from "./HowItWorks";
import { LearnBackdrop } from "./LearnBackdrop";

/**
 * Learn (`/learn`) — the promoted, plain-English explainer (doc 07-learn).
 * One job: let anyone understand what OrbitGuard does, in plain words with analogies.
 * The page is a calm scroll, not a task: story → why it matters → how it works → analogies →
 * glossary → honest limits. Static/evergreen: it renders fully with no network.
 */
export function LearnRoute() {
  const reduced = useReducedMotion();

  const scrollToGlossary = () => {
    document.getElementById("glossary")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-16 sm:px-8 sm:pt-24">
      <LearnBackdrop />

      {/* Hero — the 30-second story (one focal element, one primary action). */}
      <PageHeader
        eyebrow="Learn"
        title="Space is getting crowded. Here's how we keep satellites from crashing — explained simply."
        subtitle="OrbitGuard watches what's in orbit, spots when two objects are about to get dangerously close, and shows the one safe move to avoid a collision. No space background required."
      />

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:gap-4">
        <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
          <Link to="/avoidance">
            See it live
            <ArrowRight size={20} />
          </Link>
        </Button>
        <Button variant="ghost" onClick={scrollToGlossary} iconRight={<ArrowDown size={16} />}>
          Read the glossary
        </Button>
      </div>

      <Row gap={2} align="center" wrap aria-hidden className="pt-8 text-faint">
        <ArrowDown size={14} />
        <span className={textStyles.caption}>Why it matters · How it works · Analogies · Glossary · Honest limits</span>
      </Row>

      {/* Why it matters — what's up there, what a close approach is, and the chain-reaction risk. */}
      <Section title="Why it matters" description="Space is busy, fast, and unforgiving — here's the problem we're solving.">
        <Stack gap={6}>
          <Stack gap={4} className="max-w-[68ch]">
            <p className={cn(textStyles.bodyLg, "text-body")}>
              <Term k="leo">Low orbit</Term> is filling up. Alongside thousands of working satellites, there are
              millions of pieces of old debris — dead satellites, spent rocket stages, and fragments from past
              crashes. All of it races around Earth at thousands of metres per second, and none of the junk can steer.
            </p>
            <p className={cn(textStyles.bodyLg, "text-body")}>
              When two of those paths are about to cross closely, that's a <Term k="conjunction">close approach</Term>.
              At these speeds even a near-miss of a few hundred metres is dangerous — a direct hit would destroy both
              objects instantly.
            </p>
          </Stack>

          <Surface elevation="surface" className="border-l-2 border-warning/40">
            <Row gap={4} align="start">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <AlertTriangle size={20} strokeWidth={1.5} />
              </span>
              <Stack gap={3}>
                <Stack gap={1}>
                  <h3 className={cn(textStyles.h3, "text-strong")}>The chain-reaction risk</h3>
                  <p className={cn(textStyles.body, "text-muted")}>
                    One collision can shatter both objects into thousands of new fragments — each able to trigger the
                    next collision. Unchecked, this <Term k="kessler">debris chain reaction</Term> could make whole
                    orbits unusable. Preventing collisions today is what keeps space usable tomorrow.
                  </p>
                </Stack>
                <Row gap={2} align="center" wrap>
                  <Badge tone="neutral">One collision</Badge>
                  <ChevronRight aria-hidden size={16} className="text-faint" />
                  <Badge tone="warning">Thousands of fragments</Badge>
                  <ChevronRight aria-hidden size={16} className="text-faint" />
                  <Badge tone="danger">More collisions</Badge>
                </Row>
              </Stack>
            </Row>
          </Surface>
        </Stack>
      </Section>

      {/* How it works — See → Spot → Solve → Prove, each linking to a real route. */}
      <Section title="How it works" description="From a sky full of objects to a proven safe move — in four plain steps.">
        <HowItWorks />
      </Section>

      {/* Analogies — the friendly bit that makes it click for non-space people. */}
      <Section title="Analogies" description="The same ideas, in everyday terms.">
        <Analogies />
      </Section>

      {/* Glossary — generated from lib/terms.ts; the single source that also powers <Term> tooltips. */}
      <Section
        id="glossary"
        title="Glossary"
        description="Plain meanings first. These exact definitions also power every hover tooltip across OrbitGuard."
        className="scroll-mt-24"
      >
        <Glossary />
      </Section>

      {/* Honest limitations — no fake precision; quiet bridges to the deeper material. */}
      <Section>
        <Surface elevation="base" className="border border-hairline">
          <Row gap={4} align="start">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Info size={20} strokeWidth={1.5} />
            </span>
            <Stack gap={3}>
              <Stack gap={1}>
                <h3 className={cn(textStyles.h3, "text-strong")}>A learning tool — not mission control</h3>
                <p className={cn(textStyles.body, "max-w-[68ch] text-muted")}>
                  This is a learning and demo tool. It uses public <Term k="tle">orbit data</Term> and simplified,
                  deterministic estimates so the demo always runs the same way. Real missions need authoritative
                  tracking, flight-dynamics review, and a human in the loop.
                </p>
              </Stack>
              <Row gap={6} wrap>
                <Link
                  to="/system"
                  className={cn(textStyles.label, "inline-flex items-center gap-1 rounded-sm text-cyan underline-offset-4 hover:underline", focusRing)}
                >
                  Under the Hood
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/report"
                  className={cn(textStyles.label, "inline-flex items-center gap-1 rounded-sm text-muted transition-colors hover:text-strong", focusRing)}
                >
                  See a finished report
                  <ArrowRight size={14} />
                </Link>
              </Row>
            </Stack>
          </Row>
        </Surface>
      </Section>
    </div>
  );
}

export default LearnRoute;
