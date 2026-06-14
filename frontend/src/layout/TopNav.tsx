import {
  Activity,
  BookOpenCheck,
  ChevronDown,
  FileText,
  Home,
  Menu,
  Network,
  Play,
  Radar,
  Rocket,
  Satellite,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";

import { operatorLabel } from "../format";
import { useMissionStore } from "../state/missionStore";

type NavItem = {
  ariaLabel?: string;
  description: string;
  label: string;
  path: string;
  Icon: LucideIcon;
};

const homeItem: NavItem = { description: "Overview", label: "Start", path: "/", Icon: Home };

const primaryNavItems: NavItem[] = [
  { description: "Live cockpit", label: "Mission", path: "/mission", Icon: Satellite },
  { description: "Objects", label: "Catalog", path: "/catalog", Icon: Search },
  {
    ariaLabel: "Predictor: Avoidance burn planner",
    description: "Burn planner",
    label: "Predictor",
    path: "/avoidance",
    Icon: Rocket
  },
  { description: "Audit trail", label: "Briefing", path: "/reports", Icon: FileText },
  { description: "Pipeline", label: "System", path: "/system", Icon: Network }
];

const intelNavItems: NavItem[] = [
  { description: "Closest threats", label: "Risk Board", path: "/risk", Icon: Radar },
  { description: "Training", label: "Learn", path: "/learn", Icon: BookOpenCheck }
];

const busyStatusLabel: Record<string, string> = {
  apply: "screening",
  boot: "mission sync",
  catalog: "catalog sync",
  plan: "planning",
  replay: "replay",
  report: "briefing",
  scenario: "scenario sync"
};

export function TopNav({ demoActive, onStartDemo }: { demoActive: boolean; onStartDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const demoStatus = useMissionStore((state) => state.demoStatus);
  const busy = useMissionStore((state) => state.busy);
  const status = busy ? busyStatusLabel[busy] : operatorLabel(demoStatus?.status, "readiness sync");
  const intelActive = intelNavItems.some((item) => location.pathname === item.path);

  const closeMenus = () => {
    setOpen(false);
    setIntelOpen(false);
  };

  return (
    <header className="top-nav">
      <NavLink className="brand" to="/" onClick={closeMenus}>
        <span className="brand-mark">
          <ShieldCheck size={20} />
        </span>
        <span>
          <b>OrbitGuard</b>
          <small>Autonomous Space-Traffic Copilot</small>
        </span>
      </NavLink>
      <div className="desktop-nav-shell">
        <nav className="desktop-nav" aria-label="Primary mission routes">
          {primaryNavItems.map(({ Icon, ariaLabel, description, label, path }) => (
            <NavLink
              aria-label={ariaLabel ?? `${label}: ${description}`}
              className={({ isActive }) => clsx(isActive && "active")}
              key={path}
              onClick={() => setIntelOpen(false)}
              to={path}
            >
              <Icon size={15} />
              <span className="nav-link-copy">
                <b>{label}</b>
                <small>{description}</small>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="desktop-secondary">
          <button
            aria-expanded={intelOpen}
            aria-haspopup="menu"
            className={clsx("intel-menu-button", intelActive && "active", intelOpen && "open")}
            onClick={() => setIntelOpen((value) => !value)}
            type="button"
          >
            <Radar size={15} />
            <span>Intel</span>
            <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {intelOpen ? (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="intel-menu"
                exit={{ opacity: 0, y: reducedMotion ? 0 : -6, scale: reducedMotion ? 1 : 0.98 }}
                initial={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: reducedMotion ? 1 : 0.98 }}
                role="menu"
                transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
              >
                <span className="intel-menu-kicker">Analysis and training</span>
                {intelNavItems.map(({ Icon, description, label, path }) => (
                  <NavLink
                    className={({ isActive }) => clsx("intel-menu-link", isActive && "active")}
                    key={path}
                    onClick={closeMenus}
                    role="menuitem"
                    to={path}
                  >
                    <Icon size={17} />
                    <span>
                      <b>{label}</b>
                      <small>{description}</small>
                    </span>
                  </NavLink>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <button
        aria-label={demoActive ? "Resume guided demo" : "Start guided demo"}
        className={clsx("guided-demo-button", demoActive && "active")}
        onClick={() => {
          closeMenus();
          onStartDemo();
        }}
        type="button"
      >
        <Play size={14} />
        <span>{demoActive ? "Demo Live" : "Start Demo"}</span>
      </button>
      <div className="nav-status" aria-label={`System ${status}`}>
        <Activity size={14} />
        <span>{status}</span>
      </div>
      <button
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="menu-button"
        onClick={() => {
          setOpen((value) => !value);
          setIntelOpen(false);
        }}
        type="button"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.nav
            animate={{ opacity: 1, y: 0 }}
            aria-label="Mobile routes"
            className="mobile-nav"
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            initial={{ opacity: 0, y: reducedMotion ? 0 : -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            <div className="mobile-nav-head">
              <span>Command routes</span>
              <small>Pick the next mission station</small>
            </div>
            <button
              className={clsx("mobile-demo-button", demoActive && "active")}
              onClick={() => {
                closeMenus();
                onStartDemo();
              }}
              type="button"
            >
              <Play size={16} />
              {demoActive ? "Resume guided demo" : "Start guided demo"}
            </button>
            <div className="mobile-nav-grid">
              {[homeItem, ...primaryNavItems].map(({ Icon, ariaLabel, description, label, path }) => (
                <NavLink
                  aria-label={ariaLabel ?? `${label}: ${description}`}
                  className={({ isActive }) => clsx(isActive && "active")}
                  key={path}
                  onClick={closeMenus}
                  to={path}
                >
                  <Icon size={17} />
                  <span>
                    <b>{label}</b>
                    <small>{description}</small>
                  </span>
                </NavLink>
              ))}
            </div>
            <div className="mobile-nav-divider">Intel</div>
            <div className="mobile-nav-grid mobile-nav-grid-secondary">
              {intelNavItems.map(({ Icon, description, label, path }) => (
                <NavLink
                  className={({ isActive }) => clsx(isActive && "active")}
                  key={path}
                  onClick={closeMenus}
                  to={path}
                >
                  <Icon size={17} />
                  <span>
                    <b>{label}</b>
                    <small>{description}</small>
                  </span>
                </NavLink>
              ))}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
