import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { TERMS, type TermKey } from "../../lib/terms";
import { focusRing } from "./styles";
import { Tooltip } from "./Tooltip";

export interface InfoDotProps {
  /** Provide a dictionary term OR free-form content. */
  term?: TermKey;
  content?: ReactNode;
  label?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/** A small circular "i" for contextual help not tied to a single word (doc 05 §4). */
export function InfoDot({ term, content, label = "More information", side = "top" }: InfoDotProps) {
  const tip = term ? (
    <div className="space-y-1">
      <p className="font-medium text-strong">{TERMS[term].full}</p>
      <p className="text-muted">{TERMS[term].short}</p>
    </div>
  ) : (
    content
  );

  return (
    <Tooltip content={tip} side={side}>
      <button
        type="button"
        aria-label={label}
        className={cn("inline-flex size-6 items-center justify-center rounded-full text-faint transition-colors hover:text-muted", focusRing)}
      >
        <Info aria-hidden="true" size={16} />
      </button>
    </Tooltip>
  );
}
