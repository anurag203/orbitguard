import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import { textStyles } from "./styles";

export type FlowStepId = "sky" | "threats" | "avoidance" | "report";

const FLOW_STEPS: Array<{ id: FlowStepId; verb: string; label: string; to: string }> = [
  { id: "sky", verb: "See", label: "the sky", to: "/sky" },
  { id: "threats", verb: "Spot", label: "the danger", to: "/threats" },
  { id: "avoidance", verb: "Solve", label: "with a small nudge", to: "/avoidance" },
  { id: "report", verb: "Prove", label: "it worked", to: "/report" }
];

export interface FlowStepperProps {
  current: FlowStepId;
  className?: string;
}

/** Lightweight journey orientation for the four core chapters. Not a heading. */
export function FlowStepper({ current, className }: FlowStepperProps) {
  const currentIndex = FLOW_STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Workflow progress" data-testid="flow-stepper" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {FLOW_STEPS.map((step, index) => {
          const active = step.id === current;
          const complete = index < currentIndex;
          return (
            <li key={step.id} className="flex min-w-0 items-center gap-2">
              <Link
                to={step.to}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${index + 1} of ${FLOW_STEPS.length}: ${step.verb} ${step.label}`}
                className={cn(
                  "inline-flex min-h-8 items-center gap-2 rounded-full border px-2.5 py-1 transition-colors",
                  active
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : complete
                      ? "border-safe/30 bg-safe/10 text-safe"
                      : "border-hairline bg-surface/50 text-muted hover:text-body"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                    active ? "bg-cyan text-void" : complete ? "bg-safe text-void" : "bg-surface-2 text-muted"
                  )}
                >
                  {index + 1}
                </span>
                <span className={cn(textStyles.caption, "whitespace-nowrap")}>
                  <span className="font-semibold">{step.verb}</span>
                  <span className="hidden sm:inline"> {step.label}</span>
                </span>
              </Link>
              {index < FLOW_STEPS.length - 1 ? <span aria-hidden="true" className="text-faint">→</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
