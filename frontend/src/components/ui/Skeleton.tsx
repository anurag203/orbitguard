import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  radius?: "md" | "lg" | "full";
}

const RADIUS = { md: "rounded-md", lg: "rounded-lg", full: "rounded-full" } as const;

/** Calm shimmering placeholder. Static (no sheen) under reduced-motion. */
export function Skeleton({ width, height, radius = "md", className, style, ...rest }: SkeletonProps) {
  const reduced = useReducedMotion();
  const dimensions: CSSProperties = { width, height, ...style };
  return (
    <div aria-hidden="true" className={cn("relative overflow-hidden bg-surface-2", RADIUS[radius], className)} style={dimensions} {...rest}>
      {reduced ? null : (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-strong/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export interface LoadingStateProps {
  message?: string;
  lines?: number;
  variant?: "list" | "panel" | "stat";
  className?: string;
}

/** Skeletons + one plain sentence for a whole region (doc 01 Law 6). */
export function LoadingState({
  message = "Loading the latest orbit data…",
  lines = 3,
  variant = "list",
  className
}: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-4", className)}>
      {variant === "stat" ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={40} width={120} />
          <Skeleton height={14} width={80} />
        </div>
      ) : variant === "panel" ? (
        <div className="flex flex-col gap-3">
          <Skeleton height={20} width="40%" />
          <Skeleton height={120} radius="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton key={index} height={44} />
          ))}
        </div>
      )}
      <p className="text-[0.9375rem] text-muted">{message}</p>
    </div>
  );
}
