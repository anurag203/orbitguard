import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import { TERMS, type TermKey } from "../../lib/terms";
import { useMode } from "./ModeProvider";
import { focusRing } from "./styles";
import { Tooltip } from "./Tooltip";

export interface TermProps {
  k: TermKey;
  /** Visible plain label; defaults to TERMS[k].label. */
  children?: ReactNode;
  /** "link" (default): clicking goes to /learn#anchor. "static": no navigation. */
  as?: "link" | "static";
  className?: string;
}

/**
 * Wraps a jargon word: plain label first, technical definition in a tooltip (doc 01 Law 2).
 * Simple shows the plain word; Pro appends the technical term inline and quiet.
 */
export function Term({ k, children, as = "link", className }: TermProps) {
  const { isPro } = useMode();
  const def = TERMS[k];
  const plain = children ?? def.label;

  const triggerClass = cn(
    "rounded-sm text-body underline decoration-dotted decoration-faint underline-offset-4 transition-colors hover:decoration-muted",
    focusRing,
    className
  );

  const visible = (
    <>
      {plain}
      {isPro ? <span className="text-muted"> ({def.full})</span> : null}
    </>
  );

  const content = (
    <div className="space-y-1">
      <p className="font-medium text-strong">{def.full}</p>
      <p className="text-muted">{def.short}</p>
      {as === "link" ? <p className="text-cyan">Learn more →</p> : null}
    </div>
  );

  const trigger =
    as === "link" ? (
      <Link to={`/learn#${def.learnAnchor ?? k}`} className={triggerClass}>
        {visible}
      </Link>
    ) : (
      <button type="button" className={triggerClass}>
        {visible}
      </button>
    );

  return <Tooltip content={content}>{trigger}</Tooltip>;
}
