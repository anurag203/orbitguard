import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModeProvider } from "./ModeProvider";
import { RiskMeter } from "./RiskMeter";

function render(node: ReactNode, mode: "simple" | "pro" = "simple") {
  return renderToStaticMarkup(<ModeProvider forceMode={mode}>{node}</ModeProvider>);
}

describe("RiskMeter", () => {
  it("shows the plain risk WORD and a meter role (meaning never depends on color)", () => {
    const html = render(<RiskMeter severity="critical" pc={2.78e-4} />);
    expect(html).toContain("Danger");
    expect(html).toContain('role="meter"');
    expect(html).toContain("Collision risk: Danger");
  });

  it("maps nominal severity to the Safe word", () => {
    expect(render(<RiskMeter severity="nominal" />)).toContain("Safe");
  });

  it("renders the simple Pc sub-label in simple mode and scientific in pro", () => {
    expect(render(<RiskMeter severity="critical" pc={2.78e-4} />, "simple")).toContain("very high");
    expect(render(<RiskMeter severity="critical" pc={2.78e-4} />, "pro")).toContain("× 10");
  });
});
