import { ArrowRight, Filter, Inbox, Plus, Rocket, SatelliteDish } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  CountUp,
  DataRow,
  Dialog,
  Disclosure,
  EmptyState,
  ErrorState,
  IconButton,
  InfoDot,
  KeyValue,
  LiveChip,
  LoadingState,
  ModeProvider,
  ModeToggle,
  PageHeader,
  Pill,
  RiskBadge,
  RiskMeter,
  Row,
  ScenarioTabs,
  type ScenarioId,
  Section,
  Sheet,
  Skeleton,
  Stack,
  Stat,
  Steps,
  Surface,
  Switch,
  Tabs,
  Term,
  textStyles,
  Tooltip,
  useMode
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDeltaV, formatDistance, formatPc, formatSpeed, formatTime } from "@/lib/format";

// Demo data shared across both mode columns so the Simple/Pro difference is obvious.
const DEMO = {
  missDistanceM: 8412,
  pc: 2.78e-4,
  speedKmps: 14.742,
  deltaVMps: 0.12,
  tcaIso: "2026-06-14T14:32:08Z"
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className={cn(textStyles.eyebrow, "text-cyan")}>{title}</h3>
      {children}
    </section>
  );
}

/** Renders every component once. Reads `useMode()` so it reflects whichever mode wraps it. */
function Gallery() {
  const { mode } = useMode();
  const [pillOn, setPillOn] = useState(true);
  const [tab, setTab] = useState("globe");
  const [scenario, setScenario] = useState<ScenarioId>("protect-isro");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Stack gap={12}>
      <Block title="Formatter contract (§7)">
        <Card>
          <Stack gap={2}>
            <KeyValue label="Collision chance" layout="row">
              {formatPc(DEMO.pc, mode)}
            </KeyValue>
            <KeyValue label="Miss distance" layout="row">
              {formatDistance(DEMO.missDistanceM, mode, { comparison: true })}
            </KeyValue>
            <KeyValue label="Closing speed" layout="row">
              {formatSpeed(DEMO.speedKmps, mode)}
            </KeyValue>
            <KeyValue label="Nudge" layout="row">
              {formatDeltaV(DEMO.deltaVMps, mode)}
            </KeyValue>
            <KeyValue label="Closest approach" layout="row">
              {formatTime(DEMO.tcaIso, mode)}
            </KeyValue>
          </Stack>
        </Card>
      </Block>

      <Block title="Buttons">
        <Row gap={3} wrap>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" iconRight={<ArrowRight size={20} />}>
            Find the safe move
          </Button>
          <Button variant="primary" loading loadingText="Scanning…">
            Scan
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button asChild variant="secondary">
            <Link to="/learn">As a link</Link>
          </Button>
        </Row>
        <Row gap={3} wrap>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <IconButton label="Add" icon={<Plus size={20} />} />
          <IconButton label="Filter" icon={<Filter size={20} />} variant="surface" />
        </Row>
      </Block>

      <Block title="Surfaces">
        <Row gap={4} wrap align="stretch">
          <Card className="w-56">Card (default surface)</Card>
          <Surface elevation="surface-2" className="w-56">
            Surface · surface-2
          </Surface>
          <Surface interactive glow="cyan" className="w-56">
            Interactive · glow-cyan
          </Surface>
          <div className="relative w-56 overflow-hidden rounded-lg bg-gradient-to-br from-cyan/30 via-void to-violet/30 p-4">
            <Surface glass>Glass over the scene</Surface>
          </div>
        </Row>
      </Block>

      <Block title="Stats & count-up">
        <Row gap={8} wrap align="end">
          <Stat size="xl" tone="safe" countUp countTo={DEMO.missDistanceM} format={(n) => `${(n / 1000).toFixed(1)} km`} value="8.4 km" label="New miss distance" />
          <Stat size="lg" tone="cyan" value={<CountUp to={18400} format={(n) => Math.round(n).toLocaleString()} />} label="Objects tracked" />
          <Stat size="md" tone="danger" value={formatPc(DEMO.pc, mode)} label="Collision chance" hint={<InfoDot term="pc" />} />
        </Row>
      </Block>

      <Block title="Badges, pills & risk">
        <Row gap={2} wrap>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="cyan">Live</Badge>
          <Badge tone="violet">Sandbox</Badge>
          <Badge tone="warning">Warning</Badge>
        </Row>
        <Row gap={2} wrap>
          <Pill selected={pillOn} onClick={() => setPillOn((value) => !value)}>
            Low orbit
          </Pill>
          <Pill tone="violet">Debris</Pill>
          <Pill onRemove={() => undefined}>Removable</Pill>
        </Row>
        <Row gap={2} wrap>
          <RiskBadge severity="nominal" />
          <RiskBadge severity="watch" />
          <RiskBadge severity="warning" />
          <RiskBadge severity="critical" />
        </Row>
        <Row gap={8} wrap align="end">
          <RiskMeter severity="critical" pc={DEMO.pc} size="lg" />
          <RiskMeter severity="nominal" pc={1e-9} animateFrom={1} size="lg" />
          <div className="w-64">
            <RiskMeter severity="warning" pc={3e-5} variant="bar" />
          </div>
        </Row>
      </Block>

      <Block title="Data rows & key/values">
        <Card padding={4}>
          <DataRow label={<Term k="miss-distance">How close</Term>} value={formatDistance(DEMO.missDistanceM, mode)} />
          <DataRow label={<Term k="relative-velocity">Closing speed</Term>} value={formatSpeed(DEMO.speedKmps, mode)} />
          <DataRow label="See the threat" value="Open" href="/learn" />
          <DataRow label="Pick action" value="Run" onSelect={() => undefined} divider={false} />
        </Card>
        <Row gap={8} wrap align="start">
          <KeyValue label="Owner">ISRO</KeyValue>
          <KeyValue label="Catalog number" mono>
            25544
          </KeyValue>
          <KeyValue label="Status" layout="row">
            Operational
          </KeyValue>
        </Row>
      </Block>

      <Block title="Explanation & jargon">
        <p className={cn(textStyles.body, "max-w-[60ch] text-body")}>
          We rate the <Term k="pc">collision chance</Term> for this <Term k="conjunction">close approach</Term> as{" "}
          <RiskBadge severity="critical" size="sm" />. The <Term k="tca" as="static">closest approach</Term> is soon.
          <InfoDot content="Scenarios are saved, replayable situations." />
        </p>
        <Tooltip content="When the two objects are nearest.">
          <button type="button" className="w-fit text-cyan underline decoration-dotted underline-offset-4">
            Hover or focus me
          </button>
        </Tooltip>
      </Block>

      <Block title="Disclosure & tabs">
        <Disclosure defaultOpen={mode === "pro"}>
          <Card padding={4}>
            <KeyValue label="Covariance model" mono>
              cov-2026-06-14T14:00Z
            </KeyValue>
          </Card>
        </Disclosure>
        <Tabs
          variant="underline"
          value={tab}
          onValueChange={setTab}
          items={[
            { value: "globe", label: "Globe" },
            { value: "list", label: "List" }
          ]}
        />
        <Tabs
          variant="segmented"
          defaultValue="a"
          items={[
            { value: "a", label: "Overview" },
            { value: "b", label: "Sources" },
            { value: "c", label: "Raw" }
          ]}
        />
        <ScenarioTabs value={scenario} onValueChange={setScenario} />
      </Block>

      <Block title="Switches, dialog & sheet">
        <Row gap={4} wrap>
          <ModeToggle />
          <Switch checked={pillOn} label="Demo toggle" onCheckedChange={setPillOn} />
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
        </Row>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Export report"
          description="Choose what to include in the briefing export."
          footer={<Button variant="primary">Download .md</Button>}
        >
          A focused, interruptive task lives here.
        </Dialog>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} side="right" title="Menu">
          <Stack gap={2}>
            <Link className="text-body hover:text-strong" to="/learn">
              Learn
            </Link>
            <Link className="text-body hover:text-strong" to="/system">
              Under the hood
            </Link>
          </Stack>
        </Sheet>
      </Block>

      <Block title="Status & feedback">
        <Row gap={4} wrap align="start">
          <div className="w-64">
            <LoadingState variant="list" message="Finding close approaches…" lines={3} />
          </div>
          <div className="w-64">
            <LoadingState variant="stat" message="Crunching numbers…" />
          </div>
          <Skeleton width={180} height={80} radius="lg" />
        </Row>
        <Row gap={4} wrap align="start">
          <div className="w-72">
            <EmptyState
              icon={<Inbox size={28} />}
              title="No threats right now"
              description="Pick a scenario to see a real close approach."
              action={<Button variant="primary" size="sm" iconLeft={<Rocket size={16} />}>Pick a scenario</Button>}
            />
          </div>
          <div className="w-72">
            <ErrorState
              message="We couldn’t load this close approach."
              onRetry={() => undefined}
              detail={<>{"ApiError: 503 service_unavailable (corr-id 9f2a)"}</>}
            />
          </div>
        </Row>
        <Row gap={3} wrap>
          <LiveChip live />
          <LiveChip live={false} />
          <LiveChip live sourceUrl="https://celestrak.org" label="Live · CelesTrak" />
        </Row>
      </Block>

      <Block title="Steps">
        <Steps
          current={2}
          steps={[
            { id: "scan", label: "Scan" },
            { id: "plan", label: "Plan the nudge" },
            { id: "apply", label: "Apply" },
            { id: "check", label: "Double-check", description: <Term k="secondary-screening">Check the new path</Term> },
            { id: "done", label: "Done" }
          ]}
        />
        <div className="max-w-xs">
          <Steps
            orientation="vertical"
            current={1}
            statuses={{ apply: "error" }}
            steps={[
              { id: "scan", label: "Scan" },
              { id: "plan", label: "Plan the nudge" },
              { id: "apply", label: "Apply" },
              { id: "done", label: "Done" }
            ]}
          />
        </div>
      </Block>
    </Stack>
  );
}

function ModeColumn({ forceMode }: { forceMode: "simple" | "pro" }) {
  return (
    <ModeProvider forceMode={forceMode}>
      <div className="flex-1 rounded-xl bg-deep p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className={cn(textStyles.h3, "text-strong capitalize")}>{forceMode} mode</span>
          <Badge tone={forceMode === "pro" ? "cyan" : "neutral"}>forced</Badge>
        </div>
        <Gallery />
      </div>
    </ModeProvider>
  );
}

/** Dev-only gallery: every component in BOTH Simple and Pro mode (doc 05 §9). */
export function StyleguideRoute() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12">
      <PageHeader
        eyebrow="Dev only"
        title="OrbitGuard UI kit"
        subtitle="Every component from doc 05, rendered in both Simple and Pro mode. Toggle reduced-motion in your OS to verify motion paths."
        actions={<ModeToggle />}
      />
      <Section title="Component gallery" spacing="md" revealOnScroll={false}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ModeColumn forceMode="simple" />
          <ModeColumn forceMode="pro" />
        </div>
      </Section>
    </div>
  );
}

export default StyleguideRoute;
