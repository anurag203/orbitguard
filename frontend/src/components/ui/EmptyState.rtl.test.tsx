import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState (RTL)", () => {
  it("renders the title as a heading and the description", () => {
    render(<EmptyState title="No threats yet" description="Pick a scenario to begin." />);
    expect(screen.getByRole("heading", { name: "No threats yet" })).toBeInTheDocument();
    expect(screen.getByText("Pick a scenario to begin.")).toBeInTheDocument();
  });

  it("renders an optional action", () => {
    render(<EmptyState title="Empty" action={<button type="button">Run a scenario</button>} />);
    expect(screen.getByRole("button", { name: "Run a scenario" })).toBeInTheDocument();
  });
});
