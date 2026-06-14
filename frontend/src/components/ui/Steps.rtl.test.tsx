import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Steps } from "./Steps";

const steps = [
  { id: "detect", label: "Detect" },
  { id: "plan", label: "Plan" },
  { id: "apply", label: "Apply" }
];

describe("Steps (RTL)", () => {
  it("renders every step label", () => {
    render(<Steps steps={steps} current={1} />);
    expect(screen.getByText("Detect")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    const { container } = render(<Steps steps={steps} current={1} />);
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current).toHaveTextContent("Plan");
  });

  it("honours an explicit per-step status override", () => {
    const { container } = render(<Steps steps={steps} current={0} statuses={{ plan: "error" }} />);
    // The error step is no longer 'active', so aria-current should sit on the real active step.
    const current = container.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent("Detect");
  });
});
