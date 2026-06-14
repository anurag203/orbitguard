import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ModeProvider } from "./ModeProvider";
import { RiskMeter } from "./RiskMeter";

function renderMeter(node: ReactNode, mode: "simple" | "pro" = "simple") {
  return render(<ModeProvider forceMode={mode}>{node}</ModeProvider>);
}

describe("RiskMeter (RTL)", () => {
  it("maps a critical severity to data-level=danger and renders the plain WORD", () => {
    renderMeter(<RiskMeter severity="critical" />);
    const meter = screen.getByTestId("risk-meter");
    expect(meter).toHaveAttribute("data-level", "danger");
    expect(meter).toHaveAttribute("role", "meter");
    // Meaning never relies on color — the word is rendered as text.
    expect(meter).toHaveTextContent("Danger");
  });

  it("maps a nominal severity to data-level=safe and the Safe word", () => {
    renderMeter(<RiskMeter severity="nominal" />);
    const meter = screen.getByTestId("risk-meter");
    expect(meter).toHaveAttribute("data-level", "safe");
    expect(meter).toHaveTextContent("Safe");
  });

  it("exposes an aria-valuenow scaled 0..100 in the bar variant", () => {
    renderMeter(<RiskMeter severity="warning" variant="bar" value={0.42} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuenow", "42");
    expect(meter).toHaveAttribute("aria-label", "Collision risk: Warning");
  });
});
