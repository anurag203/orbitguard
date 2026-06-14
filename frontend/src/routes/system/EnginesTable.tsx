/**
 * Engines presented as a scannable input → output → validation grid (doc 08-system §4.3).
 *
 * A tidy table on desktop (header row + one row per engine); each engine collapses to a labelled
 * stacked card on mobile (doc 08-system §9). Pro reveals the backing module name per engine.
 */

import { cn, textStyles, useMode } from "../../components/ui";
import { ENGINES, type EngineRow } from "./config";

const COLS = "md:grid-cols-[1.5fr_1.1fr_1.1fr_1.2fr]";

/** Inline label shown only on mobile, where the desktop header row is hidden. */
function CellLabel({ children }: { children: string }) {
  return <span className={cn(textStyles.eyebrow, "text-faint md:hidden")}>{children}</span>;
}

function EngineRowItem({ engine, isPro }: { engine: EngineRow; isPro: boolean }) {
  const Icon = engine.icon;
  return (
    <div className={cn("grid grid-cols-1 gap-x-4 gap-y-3 border-b border-hairline py-4 last:border-b-0 md:items-center md:gap-y-0", COLS)}>
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Icon size={17} strokeWidth={1.5} />
        </span>
        <span className="flex flex-col">
          <span className={cn(textStyles.body, "font-medium text-strong")}>{engine.title}</span>
          {isPro ? <span className={cn(textStyles.mono, "text-[0.72rem] text-muted")}>{engine.module}</span> : null}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <CellLabel>Input</CellLabel>
        <span className={cn(textStyles.body, "text-body")}>{engine.input}</span>
      </div>
      <div className="flex flex-col gap-1">
        <CellLabel>Output</CellLabel>
        <span className={cn(textStyles.body, "text-body")}>{engine.output}</span>
      </div>
      <div className="flex flex-col gap-1">
        <CellLabel>Validation</CellLabel>
        <span className={cn(textStyles.caption, "text-muted")}>{engine.validation}</span>
      </div>
    </div>
  );
}

export function EnginesTable() {
  const { isPro } = useMode();
  return (
    <div>
      <div className={cn("hidden gap-4 border-b border-hairline pb-2 md:grid", COLS)}>
        {["Engine", "Input", "Output", "Validation"].map((heading) => (
          <span key={heading} className={cn(textStyles.eyebrow, "text-faint")}>
            {heading}
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        {ENGINES.map((engine) => (
          <EngineRowItem key={engine.title} engine={engine} isPro={isPro} />
        ))}
      </div>
    </div>
  );
}
