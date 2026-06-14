import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { rise } from "../../lib/motion";
import { textStyles } from "./styles";

export interface PageHeaderProps {
  /** Tiny uppercase label (optional). */
  eyebrow?: string;
  /** The ONE h1 for the route (doc 02 §3.2). */
  title: string;
  subtitle?: ReactNode;
  /** Usually a single primary <Button>. */
  actions?: ReactNode;
  align?: "start" | "center";
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, align = "start", className }: PageHeaderProps) {
  const reduced = useReducedMotion();
  const centered = align === "center";

  return (
    <motion.header
      variants={reduced ? undefined : rise}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      className={cn("flex flex-col gap-3", centered && "items-center text-center", className)}
    >
      {eyebrow ? <p className={cn(textStyles.eyebrow, "text-muted")}>{eyebrow}</p> : null}
      <h1 className={cn(centered ? textStyles.display : textStyles.h1, "text-strong")}>{title}</h1>
      {subtitle ? (
        <p className={cn(textStyles.bodyLg, "text-muted max-w-[68ch]", centered && "mx-auto")}>{subtitle}</p>
      ) : null}
      {actions ? <div className={cn("pt-1", centered && "flex justify-center")}>{actions}</div> : null}
    </motion.header>
  );
}
