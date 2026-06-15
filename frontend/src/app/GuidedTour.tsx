import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button, cn, textStyles } from "../components/ui";

/** The opt-in walkthrough stops (doc 03 §3.3): See → Spot → Solve → Prove. */
const STOPS = [
  {
    path: "/",
    title: "Welcome to OrbitGuard",
    narration: "OrbitGuard watches satellites and warns you before two of them crash — in plain language."
  },
  {
    path: "/sky",
    title: "See the sky",
    narration: "Everything in orbit right now. Drag to spin the Earth, then click any object to inspect it."
  },
  {
    path: "/threats",
    title: "Spot the danger",
    narration: "The risky close approaches, ranked worst-first. Each line tells you who, when, and how bad."
  },
  {
    path: "/avoidance",
    title: "Make the safe move",
    narration: "One click plans a tiny nudge that turns danger into safe — and we double-check the new path."
  },
  {
    path: "/report",
    title: "Prove it",
    narration: "A clean briefing you can export: what happened, what we did, and the evidence behind it."
  }
] as const;

export interface GuidedTourProps {
  active: boolean;
  onExit: () => void;
}

/**
 * Focused, removable product tour. It drives navigation through the five story stops with a single
 * bottom card — it does NOT lock the page, so the user can still look around at each stop.
 */
export function GuidedTour({ active, onExit }: GuidedTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  const go = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(STOPS.length - 1, index));
      setStep(clamped);
      navigate(STOPS[clamped].path);
    },
    [navigate]
  );

  // Reset to the first stop EXACTLY ONCE per open (false→true transition). react-router v7 returns a
  // new `useNavigate()` identity on every location change, so depending on `navigate` here without a
  // guard re-fired this effect on each advance and snapped the tour back to step 0 (the "frozen on
  // 1/5" bug). The ref makes the reset fire only when the tour is (re)opened.
  const openedRef = useRef(false);
  useEffect(() => {
    if (active && !openedRef.current) {
      openedRef.current = true;
      setStep(0);
      navigate(STOPS[0].path);
    } else if (!active) {
      openedRef.current = false;
    }
  }, [active, navigate]);

  // Keep the card honest if the user navigates via the header while the tour is open.
  useEffect(() => {
    if (!active) return;
    const index = STOPS.findIndex((stop) => stop.path === location.pathname);
    if (index >= 0) setStep(index);
  }, [active, location.pathname]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
      else if (event.key === "ArrowRight") go(step + 1);
      else if (event.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, step, go, onExit]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--og-tour-offset", active ? "12rem" : "0px");
    return () => root.style.setProperty("--og-tour-offset", "0px");
  }, [active]);

  const stop = STOPS[step];
  const isLast = step === STOPS.length - 1;

  return (
    <AnimatePresence>
      {active ? (
        <>
          {/* Soft vignette to focus attention on the card without blocking interaction. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-40 bg-linear-to-t from-void/70 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
          />
          <motion.div
            role="dialog"
            aria-label="Guided tour"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6"
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 24 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
          >
            <div className="pointer-events-auto w-full max-w-2xl rounded-xl bg-surface-2/95 p-5 shadow-[0_8px_50px_rgba(0,0,0,0.6)] ring-1 ring-cyan/20 backdrop-blur-md sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-cyan">
                  <Compass size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Guided tour</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    {step + 1} / {STOPS.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Exit tour"
                    onClick={onExit}
                    className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-strong"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <h2 className={cn(textStyles.h3, "text-strong")}>{stop.title}</h2>
              <p className={cn(textStyles.body, "mt-1 text-body")}>{stop.narration}</p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
                  {STOPS.map((item, index) => (
                    <span
                      key={item.path}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        index === step ? "w-6 bg-cyan" : "w-1.5 bg-surface"
                      )}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => go(step - 1)} disabled={step === 0} iconLeft={<ArrowLeft size={16} />}>
                  Back
                </Button>
                {isLast ? (
                  <Button variant="primary" size="sm" onClick={onExit}>
                    Finish
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => go(step + 1)} iconRight={<ArrowRight size={16} />}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
