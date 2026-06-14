import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Card } from "./Surface";
import { textStyles } from "./styles";

export interface EmptyStateProps {
  /** A quiet lucide glyph. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** A Button / ScenarioTabs. */
  action?: ReactNode;
  className?: string;
}

/** Friendly "nothing here yet" with the action to populate (doc 03 §5). No alarm colors. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center gap-3 text-center", className)}>
      {icon ? <span className="text-faint">{icon}</span> : null}
      <h3 className={cn(textStyles.h3, "text-strong")}>{title}</h3>
      {description ? <p className={cn(textStyles.body, "max-w-[44ch] text-muted")}>{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}
