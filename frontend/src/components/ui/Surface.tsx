import { forwardRef, useEffect, useState, type ElementType, type HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export type Elevation = "base" | "surface" | "surface-2";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  elevation?: Elevation;
  /** Tailwind units (16/24/32px). */
  padding?: 0 | 4 | 6 | 8;
  radius?: "md" | "lg" | "xl";
  /** backdrop-blur glass — ONLY over the 3D scene (doc 02 §5). Dropped under reduced transparency. */
  glass?: boolean;
  /** Hover lift + cursor; for clickable cards. */
  interactive?: boolean;
  /** Rationed glow (doc 02 §2.5). */
  glow?: "none" | "cyan" | "danger" | "safe";
}

const ELEVATION: Record<Elevation, string> = {
  base: "bg-deep", // the base surface token is `deep` (avoids `text-base` collision)
  surface: "bg-surface",
  "surface-2": "bg-surface-2"
};

const PADDING: Record<NonNullable<SurfaceProps["padding"]>, string> = {
  0: "p-0",
  4: "p-4",
  6: "p-6",
  8: "p-8"
};

const RADIUS = { md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl" } as const;

const GLOW = { none: "", cyan: "glow-cyan", danger: "glow-danger", safe: "glow-safe" } as const;

/** Honor `prefers-reduced-transparency` so glass falls back to a solid surface (doc 05 §1.5). */
function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  {
    as,
    elevation = "surface",
    padding = 6,
    radius = "lg",
    glass = false,
    interactive = false,
    glow = "none",
    className,
    children,
    ...rest
  },
  ref
) {
  const reducedTransparency = useReducedTransparency();
  // `as` is intentionally dynamic; cast keeps ref forwarding simple under strict TS.
  const Comp = (as ?? "div") as ElementType;

  const surfaceClasses = glass
    ? cn(
        "border border-hairline",
        reducedTransparency ? "bg-surface" : "bg-surface/70 backdrop-blur-[16px]"
      )
    : ELEVATION[elevation];

  return (
    <Comp
      ref={ref}
      className={cn(
        surfaceClasses,
        RADIUS[radius],
        PADDING[padding],
        "shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
        interactive &&
          "cursor-pointer transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        GLOW[glow],
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/** Common preset: a raised card (doc 05 §2). */
export function Card(props: SurfaceProps) {
  return <Surface elevation="surface" radius="lg" padding={6} {...props} />;
}
