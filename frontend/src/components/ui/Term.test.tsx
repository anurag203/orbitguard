import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ModeProvider } from "./ModeProvider";
import { Term } from "./Term";
import { TooltipProvider } from "./Tooltip";

function render(node: ReactNode, mode: "simple" | "pro") {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ModeProvider forceMode={mode}>
        <TooltipProvider>{node}</TooltipProvider>
      </ModeProvider>
    </MemoryRouter>
  );
}

describe("Term", () => {
  it("shows only the plain label in simple mode (jargon hidden until hover/focus)", () => {
    const html = render(<Term k="miss-distance" />, "simple");
    expect(html).toContain("How close");
    expect(html).not.toContain("(Miss distance)");
  });

  it("appends the technical term inline in pro mode", () => {
    const html = render(<Term k="miss-distance" />, "pro");
    expect(html).toContain("How close");
    expect(html).toContain("Miss distance");
  });

  it("links to the matching /learn anchor by default", () => {
    const html = render(<Term k="pc">collision chance</Term>, "simple");
    expect(html).toContain("collision chance");
    expect(html).toContain("/learn#pc");
  });
});
