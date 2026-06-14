import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import { EASE } from "../../lib/motion";

export interface CountUpProps {
  to: number;
  from?: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

/** Animate a number to its value on first reveal. Lands instantly under reduced-motion. */
export function CountUp({ to, from = 0, durationMs = 900, format = (n) => String(Math.round(n)), className }: CountUpProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const formatRef = useRef(format);
  formatRef.current = format;
  const [display, setDisplay] = useState(() => formatRef.current(reduced ? to : from));

  useEffect(() => {
    if (reduced) {
      setDisplay(formatRef.current(to));
      return;
    }
    if (!inView) return;
    const controls = animate(from, to, {
      duration: durationMs / 1000,
      ease: EASE,
      onUpdate: (value) => setDisplay(formatRef.current(value))
    });
    return () => controls.stop();
  }, [inView, to, from, durationMs, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{format(to)}</span>
    </span>
  );
}
