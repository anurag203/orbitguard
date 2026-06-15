import { Compass, Menu, ShieldCheck, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { cn } from "../components/ui/cn";
import { ModeToggle } from "../components/ui/Switch";

const GuidedTour = lazy(() => import("./GuidedTour").then((m) => ({ default: m.GuidedTour })));
const Sheet = lazy(() => import("../components/ui/Sheet").then((m) => ({ default: m.Sheet })));

/** The four story chapters that own the center of the bar (doc 03 §3.1). */
const CHAPTERS = [
  { to: "/sky", label: "Sky", subtitle: "See" },
  { to: "/threats", label: "Threats", subtitle: "Spot" },
  { to: "/avoidance", label: "Safe Move", subtitle: "Solve" },
  { to: "/report", label: "Report", subtitle: "Prove" }
] as const;

/** Secondary, always-available destinations (right cluster / mobile sheet). */
const UTILITY = [
  { to: "/learn", label: "Learn" },
  { to: "/system", label: "Under the hood" }
] as const;

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2.5" aria-label="OrbitGuard home">
      <span className="grid size-9 place-items-center rounded-lg bg-cyan/15 text-cyan glow-cyan">
        <ShieldCheck size={20} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[15px] font-semibold text-strong">OrbitGuard</span>
        <span className="hidden text-[11px] text-muted sm:block">Collision-avoidance copilot</span>
      </span>
    </Link>
  );
}

const TOUR_SEEN_KEY = "orbitguard.seenTour";

function DesktopChapter({ to, label, subtitle }: { to: string; label: string; subtitle: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-strong" : "text-muted hover:text-body"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex flex-col leading-tight">
            <span>{label}</span>
            <span aria-hidden="true" className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-faint xl:block">
              {subtitle}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cyan transition-opacity",
              isActive ? "opacity-100 glow-cyan" : "opacity-0"
            )}
          />
        </>
      )}
    </NavLink>
  );
}

/**
 * App chrome: a slim, quiet top bar over the story chapters + the Simple/Pro toggle and the opt-in
 * guided tour (docs 01 §4, 03 §3). The persistent "Mission Sync HUD" is intentionally gone — each
 * route now owns its own status inline (doc 03 §5).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [showTourNudge, setShowTourNudge] = useState(false);
  const location = useLocation();

  // Close the mobile sheet whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(TOUR_SEEN_KEY) === "true";
    setShowTourNudge(location.pathname === "/" && !seen);
  }, [location.pathname]);

  const markTourSeen = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_SEEN_KEY, "true");
    }
    setShowTourNudge(false);
  };

  const startTour = (fromNudge = false) => {
    setMenuOpen(false);
    if (fromNudge) markTourSeen();
    setTourActive(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-void text-body">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cyan focus:px-4 focus:py-2 focus:text-void"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-white/5 bg-void/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Brand />

          <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 md:flex">
            {CHAPTERS.map((item) => (
              <DesktopChapter key={item.to} {...item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <nav aria-label="Utility" className="hidden items-center gap-1 border-l border-white/10 pl-3 lg:flex">
              <NavLink
                to="/learn"
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-strong" : "text-muted hover:text-body"
                  )
                }
              >
                Learn
              </NavLink>
              <NavLink
                to="/system"
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-strong" : "text-muted hover:text-body"
                  )
                }
              >
                Under the hood
              </NavLink>
            </nav>

            <ModeToggle className="hidden sm:inline-flex" />

            <Button variant="secondary" size="sm" onClick={() => startTour()} iconLeft={<Compass size={16} />} className="hidden sm:inline-flex">
              Tour
            </Button>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid size-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-strong md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      {menuOpen ? (
        <Suspense fallback={null}>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen} side="right" title="Menu">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {CHAPTERS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-3 text-lg font-medium transition-colors",
                      isActive ? "bg-surface text-strong" : "text-body hover:bg-surface"
                    )
                  }
                >
                  <span className="flex flex-col">
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="text-xs uppercase tracking-[0.08em] text-faint">
                      {item.subtitle}
                    </span>
                  </span>
                </NavLink>
              ))}
              <div className="my-3 h-px bg-white/5" />
              {UTILITY.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-base transition-colors",
                      isActive ? "bg-surface text-strong" : "text-muted hover:bg-surface hover:text-body"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="my-3 h-px bg-white/5" />
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-muted">Detail level</span>
                <ModeToggle />
              </div>
              <Button variant="secondary" size="md" fullWidth onClick={() => startTour()} iconLeft={<Compass size={16} />} className="mt-3">
                Take the guided tour
              </Button>
            </nav>
          </Sheet>
        </Suspense>
      ) : null}

      {showTourNudge && !tourActive ? (
        <div className="fixed right-4 top-20 z-20 max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-cyan/20 bg-surface/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Compass aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cyan" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-strong">New here?</p>
              <p className="mt-1 text-sm leading-6 text-muted">Take the 60-second tour.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" aria-label="Start 60-second guide" onClick={() => startTour(true)}>
                  Take the 60-second tour
                </Button>
                <Button size="sm" variant="ghost" onClick={markTourSeen}>
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss suggestion"
              onClick={markTourSeen}
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {tourActive ? (
        <Suspense fallback={null}>
          <GuidedTour
            active={tourActive}
            onExit={() => {
              markTourSeen();
              setTourActive(false);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
