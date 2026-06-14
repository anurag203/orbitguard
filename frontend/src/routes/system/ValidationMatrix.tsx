/**
 * The validation matrix (doc 08-system §4.5) — four lanes, one line each: what each layer covers.
 * Static config that mirrors the testing story (doc 09) at a glance. The full live readiness
 * checks live in the health line (`SystemHealth`), so we don't duplicate them here.
 */

import { BadgeCheck } from "lucide-react";

import { cn, textStyles } from "../../components/ui";
import { VALIDATION } from "./config";

export function ValidationMatrix() {
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {VALIDATION.map((lane) => (
        <div key={lane.title} className="flex items-start gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-safe/10 text-safe">
            <BadgeCheck size={16} strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={cn(textStyles.body, "font-medium text-strong")}>{lane.title}</span>
            <span className={cn(textStyles.caption, "leading-relaxed text-muted")}>{lane.covers}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
