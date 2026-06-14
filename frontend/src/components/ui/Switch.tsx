import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "../../lib/cn";
import { useMode } from "./ModeProvider";
import { focusRing } from "./styles";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible label (visually-hidden if needed). */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Generic accessible toggle (Radix Switch). */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        "data-[state=checked]:bg-cyan data-[state=unchecked]:bg-surface-2",
        focusRing,
        className
      )}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-strong transition-transform data-[state=checked]:translate-x-[22px] motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  );
}

export interface ModeToggleProps {
  className?: string;
}

/** The global Simple ↔ Pro control (doc 01 §4). Reads/writes mode via useMode(). */
export function ModeToggle({ className }: ModeToggleProps) {
  const { isPro, setMode } = useMode();
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full bg-deep px-3 py-1.5", className)}>
      <span className={cn("text-[0.8125rem] font-medium transition-colors", isPro ? "text-muted" : "text-strong")}>Simple</span>
      <Switch
        checked={isPro}
        label="Pro mode (show technical detail)"
        onCheckedChange={(on) => setMode(on ? "pro" : "simple")}
      />
      <span className={cn("text-[0.8125rem] font-medium transition-colors", isPro ? "text-cyan" : "text-muted")}>Pro</span>
    </div>
  );
}
