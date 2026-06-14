import { cloneElement, forwardRef, isValidElement, type ReactElement, type ReactNode, type Ref } from "react";

import { cn } from "../../lib/cn";

/**
 * Minimal, dependency-free `asChild` slot (the shadcn/Radix pattern). Merges the slot's
 * className/style, composes event handlers + refs, and lets the child override everything else.
 * Used by `Button` so `<Button asChild><Link/></Button>` styles a real anchor.
 */

type AnyProps = Record<string, unknown>;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref && typeof ref === "object") (ref as { current: T | null }).current = value;
}

function composeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => void {
  return (node) => refs.forEach((ref) => assignRef(ref, node));
}

export interface SlotProps {
  children?: ReactNode;
}

export const Slot = forwardRef<HTMLElement, SlotProps & AnyProps>(function Slot(
  { children, ...slotProps },
  forwardedRef
) {
  if (!isValidElement(children)) return null;

  const child = children as ReactElement<AnyProps> & { ref?: Ref<HTMLElement> };
  const childProps = child.props;
  const merged: AnyProps = { ...slotProps, ...childProps };

  for (const key of Object.keys(slotProps)) {
    if (!/^on[A-Z]/.test(key)) continue;
    const slotHandler = slotProps[key] as ((...args: unknown[]) => void) | undefined;
    const childHandler = childProps[key] as ((...args: unknown[]) => void) | undefined;
    if (slotHandler && childHandler) {
      merged[key] = (...args: unknown[]) => {
        childHandler(...args);
        slotHandler(...args);
      };
    } else {
      merged[key] = childHandler ?? slotHandler;
    }
  }

  if (slotProps.className || childProps.className) {
    merged.className = cn(slotProps.className as string, childProps.className as string);
  }
  if (slotProps.style || childProps.style) {
    merged.style = { ...(slotProps.style as object), ...(childProps.style as object) };
  }
  merged.ref = composeRefs(forwardedRef, child.ref);

  return cloneElement(child, merged);
});
