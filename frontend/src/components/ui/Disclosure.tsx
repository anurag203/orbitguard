import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { DURATION, EASE } from "../../lib/motion";
import { focusRing } from "./styles";

export interface DisclosureProps {
  /** Trigger text; ShowDetails defaults to "Show details". */
  label?: string;
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** Collapses advanced/Pro content behind a toggle — progressive disclosure (doc 01 Law 4). */
export function Disclosure({ label = "Show details", defaultOpen = false, open, onOpenChange, children, className }: DisclosureProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internal;
  const contentId = useId();

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternal(next);
    onOpenChange?.(next);
  };

  // Only the default "Show details" label flips; custom labels stay as given.
  const triggerLabel = label === "Show details" ? (isOpen ? "Hide details" : "Show details") : label;

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm text-[0.8125rem] font-medium text-muted transition-colors hover:text-strong",
          focusRing
        )}
      >
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={cn("transition-transform motion-reduce:transition-none", isOpen && "rotate-180")}
        />
        {triggerLabel}
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            id={contentId}
            role="region"
            initial={reduced ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** `Disclosure` preset with the standard "Show details" affordance. */
export function ShowDetails(props: DisclosureProps) {
  return <Disclosure {...props} />;
}
