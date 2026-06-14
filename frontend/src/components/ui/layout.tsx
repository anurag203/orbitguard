import type { ElementType, HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

/** Tailwind spacing units (×4px) from the 8px grid (doc 02 §4). */
export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;

const GAP: Record<Space, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
  16: "gap-16",
  24: "gap-24"
};

const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch"
} as const;

const JUSTIFY = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between"
} as const;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Space;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  as?: ElementType;
}

export interface RowProps extends StackProps {
  wrap?: boolean;
}

/** Vertical flex column with spacing from the scale. */
export function Stack({ gap = 4, align, justify, as, className, children, ...rest }: StackProps) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp
      className={cn("flex flex-col", GAP[gap], align && ALIGN[align], justify && JUSTIFY[justify], className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Horizontal flex row; cross-axis defaults to center. */
export function Row({ gap = 4, align = "center", justify, wrap, as, className, children, ...rest }: RowProps) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp
      className={cn(
        "flex flex-row",
        GAP[gap],
        ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && "flex-wrap",
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
