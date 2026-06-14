import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { focusRing } from "./styles";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** REQUIRED → aria-label (there is no visible text). */
  label: string;
  /** A lucide icon. */
  icon: ReactNode;
  variant?: "ghost" | "surface";
  size?: "sm" | "md";
}

const VARIANTS = {
  ghost: "bg-transparent text-muted hover:text-strong",
  surface: "bg-surface-2 text-muted hover:text-strong hover:bg-surface-2/80"
} as const;

const SIZES = {
  sm: "h-9 w-9",
  md: "h-11 w-11"
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "ghost", size = "md", type, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition select-none",
        "active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none",
        focusRing,
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
});
