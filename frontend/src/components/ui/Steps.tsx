import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { textStyles } from "./styles";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface Step {
  id: string;
  label: string;
  description?: ReactNode;
}

export interface StepsProps {
  steps: Step[];
  /** Index of the active step. */
  current: number;
  /** Optional per-step overrides (e.g. error). */
  statuses?: Record<string, StepStatus>;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function statusOf(index: number, current: number, step: Step, statuses?: Record<string, StepStatus>): StepStatus {
  return statuses?.[step.id] ?? (index < current ? "done" : index === current ? "active" : "pending");
}

const NODE_BASE = "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold";

function StepNode({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <span className={cn(NODE_BASE, "bg-safe text-void")}>
        <Check aria-hidden="true" size={18} />
      </span>
    );
  }
  if (status === "active") {
    return <span className={cn(NODE_BASE, "glow-cyan border-2 border-cyan text-cyan")}>{index + 1}</span>;
  }
  if (status === "error") {
    return <span className={cn(NODE_BASE, "border-2 border-danger text-danger")}>{index + 1}</span>;
  }
  return <span className={cn(NODE_BASE, "border border-hairline text-faint")}>{index + 1}</span>;
}

function labelColor(status: StepStatus): string {
  if (status === "active") return "text-strong";
  if (status === "done") return "text-body";
  if (status === "error") return "text-danger";
  return "text-faint";
}

/** Visualizes the avoidance flow as ordered steps with status (doc 03 §4). */
export function Steps({ steps, current, statuses, orientation = "horizontal", className }: StepsProps) {
  return (
    <ol className={cn(orientation === "horizontal" ? "flex items-start" : "flex flex-col", className)}>
      {steps.map((step, index) => {
        const status = statusOf(index, current, step, statuses);
        const isLast = index === steps.length - 1;
        const prevDone = index > 0 && statusOf(index - 1, current, steps[index - 1], statuses) === "done";
        const connectorDone = status === "done";

        if (orientation === "horizontal") {
          return (
            <li
              key={step.id}
              aria-current={status === "active" ? "step" : undefined}
              className="flex flex-1 flex-col items-center text-center"
            >
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1 rounded-full", index === 0 ? "opacity-0" : prevDone ? "bg-safe" : "bg-hairline")} />
                <StepNode status={status} index={index} />
                <span className={cn("h-0.5 flex-1 rounded-full", isLast ? "opacity-0" : connectorDone ? "bg-safe" : "bg-hairline")} />
              </div>
              <span className={cn(textStyles.label, "mt-2", labelColor(status))}>{step.label}</span>
              {step.description ? <span className={cn(textStyles.caption, "mt-1 text-muted")}>{step.description}</span> : null}
            </li>
          );
        }

        return (
          <li key={step.id} aria-current={status === "active" ? "step" : undefined} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepNode status={status} index={index} />
              {isLast ? null : <span className={cn("mt-1 min-h-8 w-0.5 flex-1 rounded-full", connectorDone ? "bg-safe" : "bg-hairline")} />}
            </div>
            <div className={cn(isLast ? "pb-0" : "pb-6")}>
              <span className={cn(textStyles.label, "block", labelColor(status))}>{step.label}</span>
              {step.description ? <span className={cn(textStyles.caption, "mt-1 block text-muted")}>{step.description}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
