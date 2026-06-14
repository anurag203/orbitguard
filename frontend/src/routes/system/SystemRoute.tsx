/**
 * Under the Hood (`/system`) — the credibility route for the engineers (doc 08-system).
 *
 * One job: convince a technical reviewer that the pipeline, the orbital math, and the validation
 * are real — fast, and honestly. The first viewport leads with the pipeline diagram (the single
 * focal element) and exactly one primary CTA (the API contract). A small live health line sits
 * above it; the engines table, Pc model, validation matrix, and honest limitations are scannable
 * reference content below the fold. The whole page renders without the health call — only the
 * health line shimmers while it loads (doc 08-system §7).
 *
 * No 3D earth here. Simple vs Pro adjusts density via `useMode` (the kit's atoms read it). Motion
 * is restrained and one-pass; `prefers-reduced-motion` is honoured throughout.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Info, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, cn, focusRing, PageHeader, Row, Section, Stack, Surface, textStyles } from "../../components/ui";
import { rise } from "../../lib/motion";
import { API_CONTRACT_URL } from "./config";
import { EnginesTable } from "./EnginesTable";
import { PcModel } from "./PcModel";
import { PipelineDiagram } from "./PipelineDiagram";
import { SystemHealth } from "./SystemHealth";
import { ValidationMatrix } from "./ValidationMatrix";

export function SystemRoute() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-28 pt-16 sm:px-8 sm:pt-20">
      <PageHeader
        eyebrow="Under the Hood · for the engineers"
        title="How public orbit data becomes an exported, verifiable decision."
        subtitle="The real pipeline, the orbital math, and the honest limits — presented as a technical sheet you can skim, not a pitch."
        actions={
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <a href={API_CONTRACT_URL} target="_blank" rel="noreferrer noopener">
              Open the API contract
              <ArrowRight size={20} />
            </a>
          </Button>
        }
      />

      {/* Honest health line (live) — never blocks the page; only this line shimmers/retries. */}
      <div className="pt-7">
        <SystemHealth />
      </div>

      {/* Focal element: the pipeline diagram. */}
      <motion.div
        variants={reduced ? undefined : rise}
        initial={reduced ? false : "hidden"}
        animate={reduced ? false : "show"}
        className="pt-10"
      >
        <Surface elevation="surface" padding={6} className="sm:p-8">
          <Row justify="between" align="center" gap={3} wrap>
            <p className={cn(textStyles.eyebrow, "text-cyan")}>The pipeline</p>
            <span className={cn(textStyles.caption, "text-faint")}>orbit data → exported decision</span>
          </Row>
          <div className="mt-6">
            <PipelineDiagram />
          </div>
        </Surface>
      </motion.div>

      <Row gap={2} align="center" wrap aria-hidden className="pt-8 text-faint">
        <ArrowDown size={14} />
        <span className={textStyles.caption}>Engines · Pc model · Validation · Architecture &amp; limits</span>
      </Row>

      {/* Engines — scannable input → output → validation (not six big cards). */}
      <Section title="Engines" description="Each engine has one job, a clear contract, and a test that proves it." spacing="md">
        <EnginesTable />
      </Section>

      {/* The Pc model — brief, with the real covariance parameters exposed. */}
      <Section title="How we compute Pc" description="The collision-probability approach, with the actual model parameters on display." spacing="md">
        <PcModel />
      </Section>

      {/* Validation matrix — Unit · Scenario replay · Browser E2E · Visual QA. */}
      <Section title="Validation" description="Four layers, from unit tests to judge-facing visual QA." spacing="md">
        <ValidationMatrix />
      </Section>

      {/* Architecture boundary + honest limitations (doc 08-system §4.6). */}
      <Section title="Architecture & honest limits" spacing="md">
        <Stack gap={6}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <Stack gap={3}>
                <span className="flex size-10 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                  <Layers3 size={20} strokeWidth={1.5} />
                </span>
                <Stack gap={1}>
                  <h3 className={cn(textStyles.h3, "text-strong")}>One app, one service, clean seams</h3>
                  <p className={cn(textStyles.body, "text-muted")}>
                    One React frontend talks to one FastAPI backend. Inside it, the logical services — catalog,
                    propagation, screening, planning, and reporting — share a single dependency-injected graph. It stays a
                    deployable monolith: no database, no auth, no microservices for a demo that must run offline and the
                    same way every time.
                  </p>
                </Stack>
              </Stack>
            </Card>

            <Surface elevation="base" className="border border-hairline">
              <Stack gap={3}>
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <Info size={20} strokeWidth={1.5} />
                </span>
                <Stack gap={1}>
                  <h3 className={cn(textStyles.h3, "text-strong")}>Demo-grade — and honest about it</h3>
                  <p className={cn(textStyles.body, "text-muted")}>
                    OrbitGuard uses deterministic fixtures and simplified probability estimates for the demo. It is an
                    explainable decision-support prototype — not operational spacecraft command authority. Every estimate
                    ships with its assumptions on display.
                  </p>
                  <p className={cn(textStyles.caption, "text-faint")}>
                    Scenario coverage for the apply and report endpoints is still being generalised beyond Protect ISRO
                    (tracked in backend doc 08).
                  </p>
                </Stack>
              </Stack>
            </Surface>
          </div>

          <Row gap={6} wrap>
            <Link
              to="/avoidance"
              className={cn(textStyles.label, "inline-flex items-center gap-1 rounded-sm text-cyan underline-offset-4 hover:underline", focusRing)}
            >
              Review the planning logic
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/report"
              className={cn(textStyles.label, "inline-flex items-center gap-1 rounded-sm text-muted transition-colors hover:text-strong", focusRing)}
            >
              See the audit trail
              <ArrowRight size={14} />
            </Link>
          </Row>
        </Stack>
      </Section>
    </div>
  );
}

export default SystemRoute;
