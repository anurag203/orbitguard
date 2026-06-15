import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { FlowStepper, type FlowStepId } from "./FlowStepper";
import { PageHeader } from "./PageHeader";
import { textStyles } from "./styles";

export interface RouteIntroProps {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  next?: ReactNode;
  step?: FlowStepId;
  /** Sky uses the flow and one hint line, but intentionally no h1. */
  headless?: boolean;
  className?: string;
  headerClassName?: string;
  align?: "start" | "center";
}

/** Standard route opening: flow context, one h1, one plain sentence, one main action. */
export function RouteIntro({
  eyebrow,
  title,
  description,
  action,
  next,
  step,
  headless = false,
  className,
  headerClassName,
  align = "start"
}: RouteIntroProps) {
  if (headless) {
    return (
      <div className={cn("flex flex-col gap-3 border-b border-hairline bg-surface/40 px-4 py-3 backdrop-blur-md sm:px-6", className)}>
        {step ? <FlowStepper current={step} /> : null}
        {description ? <p className={cn(textStyles.caption, "max-w-[72ch] text-muted")}>{description}</p> : null}
        {next ? <p className={cn(textStyles.caption, "text-faint")}>{next}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", align === "center" && "items-center text-center", className)}>
      {step ? <FlowStepper current={step} /> : null}
      <PageHeader
        className={cn(align === "center" && "items-center text-center", headerClassName)}
        eyebrow={eyebrow}
        title={title ?? ""}
        subtitle={description}
        actions={action}
      />
      {next ? <p className={cn(textStyles.caption, "text-faint")}>{next}</p> : null}
    </div>
  );
}
