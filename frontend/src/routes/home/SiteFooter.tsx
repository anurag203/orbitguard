import { Link } from "react-router-dom";

import { cn } from "../../components/ui/cn";
import { focusRing, textStyles } from "../../components/ui/styles";

const LINKS = [
  { to: "/system", label: "Under the hood" },
  { to: "/learn", label: "Learn" }
];

/** Quiet footer (spec §4.5): wordmark, two links, and the honest demo disclaimer. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline pb-12 pt-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-[1.125rem] font-semibold text-strong">
          Orbit<span className="text-cyan">Guard</span>
        </span>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(textStyles.body, "rounded-sm text-muted transition-colors hover:text-strong", focusRing)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className={cn(textStyles.caption, "mt-6 text-faint")}>
        Simulated, deterministic demo data &mdash; not a live operational warning.
      </p>
    </footer>
  );
}
