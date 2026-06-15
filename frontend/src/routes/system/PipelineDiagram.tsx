/**
 * The pipeline diagram (doc 08-system §4.2) — the focal element of the route.
 *
 * A six-stage flow from public orbit data to an exported decision, rendered as connected nodes
 * with arrows in brand colours (doc 02 §7 — simple line diagrams, no screenshots). Horizontal on
 * desktop, vertical on mobile. Each node is a keyboard-accessible button that opens its detail
 * (interface · does · evidence · tests + a proof-route link). A one-time pulse travels along the
 * arrows on first view to suggest data flow (doc 08-system §8); it is one-pass only and disabled
 * under `prefers-reduced-motion`.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge, Button, cn, focusRing, Stack, Term, textStyles, useMode } from "../../components/ui";
import { DURATION, EASE } from "../../lib/motion";
import { PIPELINE, type PipelineStage } from "./config";

const STATIC_API = Boolean(import.meta.env.VITE_STATIC_API);

function runtimeLabel(stage: PipelineStage): string {
  if (STATIC_API && stage.hosted === "baked") return "snapshot on web";
  return "live in dev";
}

/** Resting faint arrow with a one-pass cyan pulse overlay (skipped under reduced motion). */
function FlowArrow({ index, reduced }: { index: number; reduced: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-flex items-center justify-center self-center py-1 text-faint md:py-0">
      <ArrowDown className="size-4 md:hidden" strokeWidth={1.75} />
      <ArrowRight className="hidden size-4 md:block" strokeWidth={1.75} />
      {reduced ? null : (
        <motion.span
          className="absolute inset-0 inline-flex items-center justify-center text-cyan"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.85, delay: 0.35 + index * 0.16, ease: "easeInOut" }}
        >
          <ArrowDown className="size-4 md:hidden" strokeWidth={1.75} />
          <ArrowRight className="hidden size-4 md:block" strokeWidth={1.75} />
        </motion.span>
      )}
    </span>
  );
}

function StageNode({
  stage,
  selected,
  isPro,
  onSelect
}: {
  stage: PipelineStage;
  selected: boolean;
  isPro: boolean;
  onSelect: () => void;
}) {
  const Icon = stage.icon;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Inspect the ${stage.title} stage`}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full min-w-0 flex-col gap-2 rounded-lg bg-surface p-4 text-left transition md:flex-1",
        "hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        focusRing,
        selected ? "glow-cyan" : "shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Icon size={18} strokeWidth={1.5} />
        </span>
        <span className={cn(textStyles.caption, "tabular-nums text-faint")}>{String(stage.step).padStart(2, "0")}</span>
      </div>
      <span className={cn(textStyles.label, "text-strong")}>{stage.title}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(textStyles.caption, "text-faint")}>{stage.tag}</span>
        <Badge tone={STATIC_API ? "neutral" : "cyan"} size="sm">
          {runtimeLabel(stage)}
        </Badge>
      </div>
      {isPro ? (
        <span className={cn(textStyles.mono, "mt-0.5 wrap-break-word text-[0.7rem] leading-snug text-cyan/80")}>{stage.interface}</span>
      ) : null}
    </button>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn(textStyles.eyebrow, "text-faint")}>{label}</span>
      <span className={cn(textStyles.body, "text-body")}>{children}</span>
    </div>
  );
}

function StageDetail({ stage, isPro }: { stage: PipelineStage; isPro: boolean }) {
  const Icon = stage.icon;
  return (
    <Stack gap={6}>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col">
          <span className={cn(textStyles.caption, "text-faint")}>Stage {String(stage.step).padStart(2, "0")}</span>
          <span className={cn(textStyles.h3, "text-strong")}>{stage.title}</span>
        </div>
      </div>

      <DetailField label={isPro ? "Interface" : "Stage handoff"}>
        {isPro ? (
          <code className={cn(textStyles.mono, "wrap-break-word text-cyan")}>{stage.interface}</code>
        ) : (
          stage.interfacePlain
        )}
      </DetailField>

      <DetailField label="Does">
        <span className="text-body">{stage.does}</span>
        {isPro ? <span className="mt-1 block text-muted">{stage.doesPro}</span> : null}
      </DetailField>

      <div className="grid gap-5 sm:grid-cols-2">
        <DetailField label="Evidence">{stage.evidence}</DetailField>
        <DetailField label="Tests">{stage.tests}</DetailField>
      </div>

      {stage.note ? (
        <div className="flex items-start gap-2.5 rounded-md bg-warning/10 p-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={16} />
          <p className={cn(textStyles.caption, "leading-relaxed text-body")}>{stage.note}</p>
        </div>
      ) : null}

      <Button asChild variant="ghost" size="sm" className="self-start px-0">
        <Link to={stage.proofRoute}>
          Open proof route → {stage.proofLabel}
        </Link>
      </Button>
    </Stack>
  );
}

export function PipelineDiagram() {
  const { isPro } = useMode();
  const reduced = useReducedMotion() ?? false;
  // Default to the first stage selected so the detail is always populated (credibility content).
  const [selectedId, setSelectedId] = useState<string>(PIPELINE[0].id);
  const selected = PIPELINE.find((stage) => stage.id === selectedId) ?? PIPELINE[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-stretch">
        {PIPELINE.map((stage, index) => (
          <div key={stage.id} className="contents">
            <StageNode stage={stage} selected={stage.id === selectedId} isPro={isPro} onSelect={() => setSelectedId(stage.id)} />
            {index < PIPELINE.length - 1 ? <FlowArrow index={index} reduced={reduced} /> : null}
          </div>
        ))}
      </div>

      <p className={cn(textStyles.caption, "text-faint")}>
        Click any stage to see its handoff, evidence, and tests. The local/Docker build runs the real backend; the hosted
        web demo serves pre-baked snapshots of the same responses for deterministic replay. We screen with real{" "}
        <Term k="propagation">orbit prediction</Term> and say so when a result comes from a deterministic fixture instead.
      </p>

      <div
        role="region"
        aria-live="polite"
        aria-label={`${selected.title} stage detail`}
        className="rounded-lg bg-deep p-5 sm:p-6"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.base, ease: EASE }}
          >
            <StageDetail stage={selected} isPro={isPro} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
