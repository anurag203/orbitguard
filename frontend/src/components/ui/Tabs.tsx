import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { DURATION, EASE } from "../../lib/motion";
import { focusRing } from "./styles";

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "underline" | "segmented";
  /** <TabsPanel value=…> contents (or render externally). */
  children?: ReactNode;
  className?: string;
}

/** In-page view switch built on Radix Tabs (doc 05 §5). */
export function Tabs({ items, value, defaultValue, onValueChange, variant = "underline", children, className }: TabsProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState(value ?? defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const layoutId = useId();

  const handle = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsPrimitive.Root value={active} onValueChange={handle} className={className}>
      <TabsPrimitive.List
        className={cn(
          variant === "segmented"
            ? "inline-flex gap-1 rounded-full bg-deep p-1"
            : "flex gap-4 border-b border-hairline"
        )}
      >
        {items.map((item) => {
          const isActive = item.value === active;
          return (
            <TabsPrimitive.Trigger
              key={item.value}
              value={item.value}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-sm transition-colors",
                focusRing,
                variant === "segmented"
                  ? cn("z-10 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium", isActive ? "text-strong" : "text-muted hover:text-strong")
                  : cn("px-1 pb-2 text-[0.9375rem]", isActive ? "text-strong" : "text-muted hover:text-strong")
              )}
            >
              {item.icon}
              {item.label}
              {isActive && variant === "underline" ? (
                reduced ? (
                  <span className="glow-cyan absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-cyan" />
                ) : (
                  <motion.span
                    layoutId={`${layoutId}-underline`}
                    className="glow-cyan absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-cyan"
                    transition={{ duration: DURATION.base, ease: EASE }}
                  />
                )
              ) : null}
              {isActive && variant === "segmented" ? (
                reduced ? (
                  <span className="absolute inset-0 -z-10 rounded-full bg-surface-2" />
                ) : (
                  <motion.span
                    layoutId={`${layoutId}-pill`}
                    className="absolute inset-0 -z-10 rounded-full bg-surface-2"
                    transition={{ duration: DURATION.base, ease: EASE }}
                  />
                )
              ) : null}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children ?? (
        // View-switch usage renders its content externally (not via <TabsPanel>).
        // Radix still points each trigger's `aria-controls` at a panel id, so we
        // mount empty, force-mounted panels to keep those IDREFs valid (a11y:
        // avoids axe `aria-valid-attr-value` dangling-reference violations).
        items.map((item) => (
          <TabsPrimitive.Content key={item.value} value={item.value} forceMount className="sr-only" />
        ))
      )}
    </TabsPrimitive.Root>
  );
}

/** Radix Tabs content panel (render inside <Tabs>). */
export const TabsPanel = TabsPrimitive.Content;
