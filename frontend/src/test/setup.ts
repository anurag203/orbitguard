/**
 * Vitest setup (jsdom). Adds jest-dom matchers (toBeInTheDocument, toHaveFocus,
 * toHaveAttribute, …), auto-cleans the DOM between tests, and stubs the browser
 * APIs jsdom doesn't implement but our components touch (matchMedia for
 * useReducedMotion, ResizeObserver/IntersectionObserver for Radix/Framer).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// A loosely-typed view of the global so we can polyfill missing jsdom APIs
// without fighting `lib.dom` narrowing (jsdom omits these entirely).
const globalAny = globalThis as unknown as Record<string, unknown>;

if (typeof window !== "undefined") {
  if (typeof globalAny.matchMedia !== "function") {
    globalAny.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  }

  if (typeof globalAny.ResizeObserver !== "function") {
    globalAny.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  globalAny.scrollTo = vi.fn();

  if (typeof globalAny.IntersectionObserver !== "function") {
    globalAny.IntersectionObserver = class {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: number[] = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }
}
