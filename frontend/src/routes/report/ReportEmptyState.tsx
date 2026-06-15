import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button, cn, Surface, textStyles } from "../../components/ui";

export interface ReportEmptyStateProps {
  /** Friendly protected-asset name (cyan accent — the thing we keep safe). */
  protectedName: string;
  scenarioTitle: string;
  /** Build the deterministic report chain. */
  onGenerate: () => void;
  /** Baked report deep-link for the first-load demo path. */
  sampleReportTo?: string;
}

/** The three plain sections every briefing contains — previewed before generation. */
const OUTLINE = [
  {
    n: "1",
    title: "What happened",
    body: "The close approach we found — who, from what, when, and how close — in plain language."
  },
  {
    n: "2",
    title: "What we did",
    body: "The smallest safe nudge that clears the risk, and why the copilot chose it."
  },
  {
    n: "3",
    title: "The proof",
    body: "The new closest gap, the crash-chance drop, and the double-check against everything else we track."
  }
] as const;

/**
 * `/report` empty state, reframed as a deliberate hero (plan 04 §3). Rather than a small card in a
 * tall void, it previews exactly what the briefing will contain and offers one confident action —
 * so a judge landing here understands the payoff before generating it.
 */
export function ReportEmptyState({ protectedName, scenarioTitle, onGenerate, sampleReportTo }: ReportEmptyStateProps) {
  return (
    <Surface elevation="surface" padding={8} radius="xl" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <FileText aria-hidden="true" size={24} />
        </span>
        <div className="flex flex-col gap-2.5">
          <h2 className={cn(textStyles.h2, "text-strong")}>Your mission briefing, ready to generate</h2>
          <p className={cn(textStyles.bodyLg, "max-w-[60ch] text-muted")}>
            One click writes up the whole decision for {protectedName}: the threat we found, the safe move we made, and
            the proof it works — exportable as a shareable Markdown packet.
          </p>
        </div>
        <Badge tone="cyan" size="md" icon={<ShieldCheck aria-hidden="true" size={13} />} className="self-start">
          Protecting {protectedName}
        </Badge>
      </div>

      <div className="flex flex-col gap-5 border-t border-hairline pt-7">
        <p className={cn(textStyles.eyebrow, "text-muted")}>What's inside</p>
        <ul className="flex flex-col gap-5">
          {OUTLINE.map((section) => (
            <li key={section.n} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-[13px] font-semibold text-cyan">
                {section.n}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={cn(textStyles.body, "font-semibold text-strong")}>{section.title}</span>
                <span className={cn(textStyles.body, "text-muted")}>{section.body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline pt-7 sm:flex-row sm:items-center">
        <Button
          variant="primary"
          size="lg"
          className="glow-cyan w-full sm:w-auto"
          iconLeft={<FileText size={20} />}
          onClick={onGenerate}
        >
          Generate briefing
        </Button>
        {sampleReportTo ? (
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <Link to={sampleReportTo}>
              View a finished report
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
          <Link to="/avoidance">
            Safe Move
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </Button>
        <span className={cn(textStyles.caption, "text-faint sm:ml-auto")}>Offline demo data · {scenarioTitle}</span>
      </div>
    </Surface>
  );
}
