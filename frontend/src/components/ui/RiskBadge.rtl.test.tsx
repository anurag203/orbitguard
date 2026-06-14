import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskBadge } from "./RiskBadge";

describe("RiskBadge (RTL)", () => {
  it("maps a backend severity to its plain risk word", () => {
    render(<RiskBadge severity="critical" />);
    expect(screen.getByText("Danger")).toBeInTheDocument();
  });

  it("renders a canonical level directly", () => {
    render(<RiskBadge level="safe" />);
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("falls back to a neutral-cautious Watch for unknown severities", () => {
    render(<RiskBadge severity="totally-unknown" />);
    expect(screen.getByText("Watch")).toBeInTheDocument();
  });
});
