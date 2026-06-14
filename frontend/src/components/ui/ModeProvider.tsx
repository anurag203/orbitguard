import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { Mode } from "../../lib/format";

/**
 * Global "Simple | Pro" mode (doc 01 §4). Simple = plain language for non-space users;
 * Pro = exact scientific values. Every component that renders a number reads `useMode()`.
 *
 * Source of truth mirrors localStorage; `forceMode` lets the styleguide/tests pin a mode
 * (and nest two providers to render both modes at once).
 */
export type { Mode };

interface ModeContextValue {
  mode: Mode;
  isPro: boolean;
  setMode: (mode: Mode) => void;
  toggle: () => void;
  /** @deprecated alias for `toggle` (kept for back-compat). */
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);
const STORAGE_KEY = "orbitguard.mode";

interface ModeProviderProps {
  children: ReactNode;
  /** Override store + persistence (styleguide / tests). When set, `setMode` is a no-op. */
  forceMode?: Mode;
}

export function ModeProvider({ children, forceMode }: ModeProviderProps) {
  const [storedMode, setStoredMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "simple";
    return window.localStorage.getItem(STORAGE_KEY) === "pro" ? "pro" : "simple";
  });

  const forced = forceMode !== undefined;
  const mode: Mode = forced ? forceMode : storedMode;

  useEffect(() => {
    if (forced) return; // forced providers never touch global persistence
    window.localStorage.setItem(STORAGE_KEY, storedMode);
    document.documentElement.dataset.mode = storedMode;
  }, [forced, storedMode]);

  const setMode = (next: Mode) => {
    if (forced) return;
    setStoredMode(next);
  };
  const toggle = () => setMode(mode === "simple" ? "pro" : "simple");

  const value: ModeContextValue = {
    mode,
    isPro: mode === "pro",
    setMode,
    toggle,
    toggleMode: toggle
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) throw new Error("useMode must be used within a ModeProvider");
  return context;
}
