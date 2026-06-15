import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { EarthScene } from "../../components/earth";
import { Button } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import { LiveChip } from "../../components/ui/LiveChip";
import { textStyles } from "../../components/ui/styles";
import { EASE } from "../../lib/motion";

export interface HeroProps {
  /** The active scenario powering the 3D scene (defaults to the hero scenario upstream). */
  scenarioId: string;
  /** The protected asset name (the live Protect ISRO status). */
  protectedName: string;
  /** Data provenance for the live/offline chip. */
  isLive: boolean;
}

/** Stagger the hero copy in (~60ms) after a beat (doc 02 §6 / spec §8). */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
};

/** Each line fades + rises 8px, slow (matches doc 02 §6.2 `rise`). */
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }
};

/**
 * The focal viewport: a live, draggable Earth behind one headline, one value prop, and the single
 * glowing CTA (doc 01 Law 1 / spec §3). On mobile the Earth becomes a top band with the copy below
 * (spec §9); on desktop the copy floats over the scene in the left column.
 */
export function Hero({ scenarioId, protectedName, isLive }: HeroProps) {
  const reduced = useReducedMotion();

  return (
    <section className="relative isolate w-full overflow-hidden bg-void md:min-h-[88svh]">
      {/* The one focal element: the live Earth. Lazy 3D; fades up from black (spec §8). */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? false : { opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative h-[45svh] w-full md:absolute md:inset-0 md:h-full"
      >
        <EarthScene
          phase="alert"
          scenarioId={scenarioId}
          selectedObject={protectedName}
          interactive
          enableZoom={false}
          framing={{
            distance: 3.45,
            minDistance: 3.45,
            maxDistance: 3.45,
            polar: 1.28,
            azimuth: -0.42,
            fov: 31,
            autoRotate: true
          }}
          showThreatLine={false}
          showLabels={false}
        />
        {/* Scrim for text legibility — never captures pointer events so the Earth stays draggable.
            Mobile: darken top + bottom. Desktop: a stronger left-to-right wash so the copy column
            reads crisply over the globe, plus a soft bottom fade into the next section. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/30 via-transparent to-void md:bg-gradient-to-r md:from-void md:via-void/70 md:to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-void to-transparent md:block"
        />
      </motion.div>

      {/* Hero copy. The wrapper is click-through on desktop so drags reach the Earth behind it. */}
      <motion.div
        variants={reduced ? undefined : container}
        initial={reduced ? false : "hidden"}
        animate={reduced ? false : "show"}
        className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center px-5 py-10 text-center md:pointer-events-none md:min-h-[88svh] md:items-start md:justify-center md:px-8 md:py-0 md:text-left"
      >
        <div className="flex max-w-xl flex-col gap-5 md:pointer-events-auto">
          <motion.div variants={reduced ? undefined : item}>
            <span
              className={cn(
                textStyles.eyebrow,
                "inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-void/60 px-3 py-1.5 text-muted backdrop-blur-sm"
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
              </span>
              Autonomous collision-avoidance copilot
            </span>
          </motion.div>

          <motion.h1 variants={reduced ? undefined : item} className={cn(textStyles.display, "text-strong")}>
            Don&rsquo;t just see the risk. Clear it.
          </motion.h1>

          <motion.p variants={reduced ? undefined : item} className={cn(textStyles.bodyLg, "max-w-[46ch] text-body")}>
            Space is getting crowded. OrbitGuard spots when two objects are about to get dangerously close
            &mdash; and shows the one small move that avoids a crash.
          </motion.p>

          <motion.div
            variants={reduced ? undefined : item}
            className="flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center"
          >
            <Button asChild variant="primary" size="lg" fullWidth className="glow-cyan sm:w-auto">
              <Link to="/threats">
                See a live threat
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/sky">or just explore the sky</Link>
            </Button>
          </motion.div>

          <motion.div
            variants={reduced ? undefined : item}
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 md:justify-start"
          >
            <LiveChip live={isLive} />
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-faint">
              <ShieldCheck size={14} className="text-safe" aria-hidden="true" />
              Protecting {protectedName}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Quiet scroll cue (desktop, where the hero is full-height). */}
      <div className="pointer-events-none absolute bottom-6 left-8 z-10 hidden md:flex">
        <span className="inline-flex flex-col items-center gap-1 text-[0.75rem] font-medium text-faint">
          Scroll
          <ChevronDown size={16} className="animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}
