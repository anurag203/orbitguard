import { motion, useReducedMotion } from "framer-motion";
import { useId, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { rise } from "../../lib/motion";
import { textStyles } from "./styles";

// Omit the handful of handlers whose React types conflict with Framer's motion props.
type MotionSafeAttrs = Omit<
  HTMLAttributes<HTMLElement>,
  "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onDrag" | "onDragStart" | "onDragEnd"
>;

export interface SectionProps extends MotionSafeAttrs {
  /** Optional h2. */
  title?: string;
  description?: ReactNode;
  /** 64 / 96px top rhythm. */
  spacing?: "md" | "lg";
  /** Fade/rise when entering the viewport (doc 02 §6.2). */
  revealOnScroll?: boolean;
}

export function Section({
  title,
  description,
  spacing = "lg",
  revealOnScroll = true,
  className,
  children,
  ...rest
}: SectionProps) {
  const reduced = useReducedMotion();
  const headingId = useId();
  // Reduced-motion (and revealOnScroll=false) render the content fully, immediately — motion only
  // ever *enhances*, it never gates visibility (plan 04 §2). The reveal triggers early and once, so
  // first-viewport content shows on load and below-fold content reveals well before it's centered.
  const animate = revealOnScroll && !reduced;

  return (
    <motion.section
      {...(animate
        ? {
            variants: rise,
            initial: "hidden" as const,
            whileInView: "show" as const,
            viewport: { once: true, amount: 0.15, margin: "0px 0px -10% 0px" }
          }
        : {})}
      aria-labelledby={title ? headingId : undefined}
      className={cn(spacing === "lg" ? "pt-24" : "pt-16", className)}
      {...rest}
    >
      {title ? (
        <h2 id={headingId} className={cn(textStyles.h2, "text-strong")}>
          {title}
        </h2>
      ) : null}
      {description ? <p className={cn(textStyles.body, "mt-2 max-w-[68ch] text-muted")}>{description}</p> : null}
      <div className={cn(title || description ? "mt-6" : undefined)}>{children}</div>
    </motion.section>
  );
}
