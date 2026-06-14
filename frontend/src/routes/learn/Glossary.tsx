import { useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Card, cn, Disclosure, focusRing, Stack, textStyles, useMode } from "../../components/ui";
import { formatPcPro } from "../../lib/format";
import { TERMS, type TermDef, type TermKey } from "../../lib/terms";

/**
 * The glossary (doc 07-learn §4.4) — generated FROM `lib/terms.ts` so it stays the single source
 * of truth that ALSO powers every `<Term>` tooltip. Add a term once → it shows here AND is
 * hoverable app-wide. Plain meaning first; the scientific term + example sit behind a Disclosure
 * that Pro mode auto-reveals.
 */

/** Optional Pro example values, aligned with the canonical Protect ISRO demo figures. */
const EXAMPLES: Partial<Record<TermKey, string>> = {
  tca: "e.g. in about 4 hours",
  "miss-distance": "e.g. 600 m → 8.4 km after the nudge",
  pc: `e.g. ${formatPcPro(2.78e-4)} (about 1 in 3,600)`,
  conjunction: "e.g. CARTOSAT-2F vs. debris, 600 m apart",
  "delta-v": "e.g. 0.12 m/s",
  "relative-velocity": "e.g. ≈ 14.7 km/s",
  leo: "below ~2,000 km altitude",
  "norad-id": "e.g. 25544 (the ISS)",
  kessler: "1 crash → thousands of fragments → more crashes"
};

const ENTRIES = Object.entries(TERMS) as Array<[TermKey, TermDef]>;

export function Glossary() {
  const { mode, isPro } = useMode();
  const reduced = useReducedMotion();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return ENTRIES;
    return ENTRIES.filter(([, def]) =>
      [def.label, def.full, def.short].some((field) => field.toLowerCase().includes(normalized))
    );
  }, [normalized]);

  // Deep-link support: when <Term>'s "Learn more" routes to /learn#<key>, scroll to the matching
  // card and give it a brief cyan highlight (doc 07-learn §8). Reduced motion → instant, no glow.
  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash || !(hash in TERMS)) return;
    setQuery("");
    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      if (reduced) return;
      setActiveId(hash);
      window.setTimeout(() => setActiveId(null), 1200);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, reduced]);

  return (
    <div>
      <div className="sticky top-4 z-10 mb-6">
        <label className="relative block">
          <span className="sr-only">Filter glossary terms</span>
          <Search aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter terms…"
            className={cn(
              "h-11 w-full rounded-md border border-hairline bg-deep pl-9 pr-3 text-body placeholder:text-faint",
              focusRing
            )}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className={cn(textStyles.body, "text-muted")}>
          No terms match “{query.trim()}”. Try a simpler word.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(([key, def]) => {
            const example = EXAMPLES[key];
            const highlighted = activeId === key && !reduced;
            return (
              <Card
                key={key}
                id={key}
                className={cn("scroll-mt-28 transition-shadow duration-700 motion-reduce:transition-none", highlighted && "glow-cyan")}
              >
                <Stack gap={2}>
                  <h3 className={cn(textStyles.h3, "text-strong")}>{def.label}</h3>
                  <p className={cn(textStyles.body, "text-body")}>{def.short}</p>
                  <Disclosure key={mode} label="Show the scientific term" defaultOpen={isPro} className="pt-1">
                    <Stack gap={1}>
                      <p className={cn(textStyles.caption, "text-muted")}>Scientific term</p>
                      <p className={cn(textStyles.body, "text-body")}>{def.full}</p>
                      {example ? <p className={cn(textStyles.mono, "text-faint")}>{example}</p> : null}
                    </Stack>
                  </Disclosure>
                </Stack>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Glossary;
