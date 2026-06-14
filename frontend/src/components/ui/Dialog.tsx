import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { DURATION, EASE } from "../../lib/motion";
import { IconButton } from "./IconButton";
import { textStyles } from "./styles";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required → accessible name (DialogTitle). */
  title: string;
  description?: string;
  children: ReactNode;
  /** Actions (one primary Button). */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;

/** Modal for focused, interruptive tasks (doc 05 §5). */
export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  const reduced = useReducedMotion();
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
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <DialogPrimitive.Content asChild forceMount aria-describedby={description ? undefined : undefined}>
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: DURATION.base, ease: EASE }}
                  className={cn(
                    "pointer-events-auto w-[calc(100vw-2rem)] rounded-xl bg-surface-2 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
                    SIZE[size]
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <DialogPrimitive.Title className={cn(textStyles.h3, "text-strong")}>{title}</DialogPrimitive.Title>
                      {description ? (
                        <DialogPrimitive.Description className="text-[0.9375rem] text-muted">
                          {description}
                        </DialogPrimitive.Description>
                      ) : null}
                    </div>
                    <DialogPrimitive.Close asChild>
                      <IconButton label="Close" icon={<X size={20} />} />
                    </DialogPrimitive.Close>
                  </div>
                  <div className="mt-4 text-[0.9375rem] leading-[1.6] text-body">{children}</div>
                  {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
