import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { DURATION, EASE } from "../../lib/motion";
import { IconButton } from "./IconButton";
import { textStyles } from "./styles";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right" | "bottom";
  /** Accessible name. */
  title: string;
  children: ReactNode;
}

const POSITION = {
  left: "inset-y-0 left-0 h-full w-full max-w-sm",
  right: "inset-y-0 right-0 h-full w-full max-w-sm",
  bottom: "inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-xl"
} as const;

function slide(side: SheetProps["side"], reduced: boolean): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
} {
  if (reduced) return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  if (side === "left") return { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } };
  if (side === "bottom") return { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };
  return { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };
}

/** Edge-anchored slide-over for mobile nav/filters/panels (doc 05 §5). A Dialog that slides. */
export function Sheet({ open, onOpenChange, side = "right", title, children }: SheetProps) {
  const reduced = useReducedMotion() ?? false;
  const motionProps = slide(side, reduced);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast }}
                className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={motionProps.initial}
                animate={motionProps.animate}
                exit={motionProps.exit}
                transition={{ duration: DURATION.base, ease: EASE }}
                className={cn(
                  "fixed z-50 flex flex-col gap-4 bg-surface-2 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
                  POSITION[side]
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <DialogPrimitive.Title className={cn(textStyles.h3, "text-strong")}>{title}</DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <IconButton label="Close" icon={<X size={20} />} />
                  </DialogPrimitive.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
