import { Compass, Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { Button, cn, ModeToggle, Sheet } from "../components/ui";
import { GuidedTour } from "./GuidedTour";

/** The four story chapters that own the center of the bar (doc 03 §3.1). */
const CHAPTERS = [
  { to: "/sky", label: "Sky" },
  { to: "/threats", label: "Threats" },
  { to: "/avoidance", label: "Safe Move" },
  { to: "/report", label: "Report" }
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

function DesktopChapter({ to, label }: { to: string; label: string }) {
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
          {label}
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
  const location = useLocation();

  // Close the mobile sheet whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const startTour = () => {
    setMenuOpen(false);
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
            <NavLink
              to="/learn"
              className={({ isActive }) =>
                cn(
                  "hidden rounded-md px-3 py-2 text-sm font-medium transition-colors lg:inline-block",
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
                  "hidden rounded-md px-3 py-2 text-sm font-medium transition-colors lg:inline-block",
                  isActive ? "text-strong" : "text-muted hover:text-body"
                )
              }
            >
              Under the hood
            </NavLink>

            <ModeToggle className="hidden sm:inline-flex" />

            <Button variant="secondary" size="sm" onClick={startTour} iconLeft={<Compass size={16} />} className="hidden sm:inline-flex">
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
              {item.label}
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
          <Button variant="secondary" size="md" fullWidth onClick={startTour} iconLeft={<Compass size={16} />} className="mt-3">
            Take the guided tour
          </Button>
        </nav>
      </Sheet>

      <GuidedTour active={tourActive} onExit={() => setTourActive(false)} />
    </div>
  );
}
