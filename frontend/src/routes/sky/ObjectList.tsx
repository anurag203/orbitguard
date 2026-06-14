/**
 * ObjectList — the catalog, calmed down (redesign/routes/02-sky.md §4.3).
 *
 * Each row: class glyph + name + one plain descriptor + a right-side risk tag. The selected row
 * syncs with the globe selection. Pro adds NORAD id + source columns (a denser read). Rows
 * stagger-rise on first show and lift on hover; both are dropped under reduced motion.
 */
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { Badge, cn, RiskBadge, textStyles, useMode } from "../../components/ui";
import { DURATION, EASE } from "../../lib/motion";
import { ClassIcon } from "./ObjectPanel";
import { descriptor, objectTag, ownerLabel, type SkyObject } from "./sky-data";

export interface ObjectListProps {
  objects: SkyObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } }
};

function ObjectRow({
  object,
  selected,
  isPro,
  onSelect
}: {
  object: SkyObject;
  selected: boolean;
  isPro: boolean;
  onSelect: () => void;
}) {
  const tag = objectTag(object);
  return (
    <motion.li variants={rowVariants}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition",
          "hover:-translate-y-0.5 hover:bg-surface-2/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70",
          selected ? "border-cyan/60 bg-surface-2 glow-cyan" : "border-hairline bg-surface/40"
        )}
      >
        <ClassIcon object={object} compact />
        <div className="min-w-0 flex-1">
          <p className={cn(textStyles.body, "truncate font-medium text-strong")}>{object.name}</p>
          <p className={cn(textStyles.caption, "truncate text-muted")}>{descriptor(object, isPro ? "pro" : "simple")}</p>
        </div>

        {isPro ? (
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <span className={cn(textStyles.mono, "text-[0.75rem] text-muted")}>{object.catalog?.norad_id ?? "—"}</span>
            <span className={cn(textStyles.caption, "text-faint")}>{ownerLabel(object)}</span>
          </div>
        ) : null}

        {object.conjunction ? (
          <RiskBadge severity={object.conjunction.risk.severity} size="sm" className="shrink-0" />
        ) : (
          <Badge tone={tag.risk} className="shrink-0">
            {tag.label}
          </Badge>
        )}
      </button>
    </motion.li>
  );
}

export function ObjectList({ objects, selectedId, onSelect, className }: ObjectListProps) {
  const reduced = useReducedMotion();
  const { isPro } = useMode();

  return (
    <motion.ul
      variants={reduced ? undefined : listVariants}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      className={cn("flex flex-col gap-2", className)}
    >
      {objects.map((object) => (
        <ObjectRow
          key={object.id}
          object={object}
          selected={object.id === selectedId}
          isPro={isPro}
          onSelect={() => onSelect(object.id)}
        />
      ))}
    </motion.ul>
  );
}
