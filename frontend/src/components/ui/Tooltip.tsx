import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactElement, ReactNode } from "react";

import { cn } from "../../lib/cn";
import { DURATION, EASE } from "../../lib/motion";

/** Re-exported so `app/providers.tsx` can mount a single provider. */
export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  /** The trigger (asChild) — must be focusable. */
  children: ReactElement;
  className?: string;
}

/** Styled Radix Tooltip used by Term, InfoDot, and any "hover/focus for a hint" affordance. */
export function Tooltip({ content, side = "top", align = "center", delayDuration = 150, children, className }: TooltipProps) {
  const reduced = useReducedMotion();
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content asChild side={side} align={align} sideOffset={6} collisionPadding={8}>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className={cn(
              "z-50 max-w-xs rounded-md bg-surface-2 px-3 py-2 text-[12px] leading-snug text-body shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface-2" />
          </motion.div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
