import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Card } from "./Surface";
import { textStyles } from "./styles";

export interface GuidanceStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}

/** Compact state copy: icon, one plain line, one next action. */
export function GuidanceState({ icon, title, message, action, role, className }: GuidanceStateProps) {
  return (
    <Card role={role} className={cn("flex flex-col items-center gap-3 text-center", className)}>
      {icon ? <span className="text-faint">{icon}</span> : null}
      {title ? <h3 className={cn(textStyles.h3, "text-strong")}>{title}</h3> : null}
      {message ? <p className={cn(textStyles.body, "max-w-[46ch] text-muted")}>{message}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}
