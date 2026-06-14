import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Slot } from "./Slot";
import { focusRing } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner + keeps a plain label (never a bare spinner, doc 01 Law 6). */
  loading?: boolean;
  loadingText?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  /** Render as the child element (e.g. a Router <Link>) keeping button styling. */
  asChild?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // cyan fill, near-black text for AA contrast; glow only intensifies on hover (doc 02 §8).
  primary: "bg-cyan text-void font-semibold hover:glow-cyan",
  secondary: "bg-surface-2 text-body hover:bg-surface-2/80",
  ghost: "bg-transparent text-muted hover:text-strong hover:underline underline-offset-4"
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-[17px]"
};

/** Build the class string for a button — exported so other controls can match its look. */
export function buttonVariants(opts?: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean }): string {
  const { variant = "secondary", size = "md", fullWidth = false } = opts ?? {};
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium select-none transition",
    "motion-reduce:transition-none hover:-translate-y-px motion-reduce:hover:translate-y-0",
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full"
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    loadingText = "Working…",
    iconLeft,
    iconRight,
    fullWidth = false,
    asChild = false,
    disabled,
    type,
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const classes = cn(
    buttonVariants({ variant, size, fullWidth }),
    isDisabled && "opacity-50 pointer-events-none",
    className
  );

  if (asChild) {
    // The consumer supplies the full child content; styling + a11y flags pass through.
    return (
      <Slot ref={ref as never} className={classes} aria-busy={loading || undefined} aria-disabled={isDisabled || undefined}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 aria-hidden="true" className="size-[1.1em] animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
});
