import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { ShowDetails } from "./Disclosure";
import { Card } from "./Surface";
import { textStyles } from "./styles";

export interface ErrorStateProps {
  title?: string;
  /** Human message (NOT a raw stack / code). */
  message?: string;
  /** Wires to React Query refetch / mutation reset. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Raw error behind a ShowDetails (Pro). */
  detail?: ReactNode;
  className?: string;
}

/** Plain-language failure + retry (doc 03 §5). Announced via role="alert". */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  detail,
  className
}: ErrorStateProps) {
  return (
    <Card role="alert" className={cn("flex flex-col items-start gap-3", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-danger" size={20} />
        <div className="space-y-1">
          <h3 className={cn(textStyles.h3, "text-strong")}>{title}</h3>
          {message ? <p className={cn(textStyles.body, "text-muted")}>{message}</p> : null}
        </div>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
      {detail ? (
        <ShowDetails className="w-full">
          <pre className={cn(textStyles.mono, "overflow-auto whitespace-pre-wrap rounded-md bg-deep p-3 text-faint")}>
            {detail}
          </pre>
        </ShowDetails>
      ) : null}
    </Card>
  );
}
