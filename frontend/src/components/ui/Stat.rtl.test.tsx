import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stat } from "./Stat";

describe("Stat (RTL)", () => {
  it("renders a pre-formatted value with its label", () => {
    render(<Stat value="600 m" label="Miss distance" />);
    expect(screen.getByText("600 m")).toBeInTheDocument();
    expect(screen.getByText("Miss distance")).toBeInTheDocument();
  });

  it("counts up to its target when countUp is enabled", async () => {
    render(<Stat value={null} label="Objects tracked" countUp countTo={128} />);
    expect(await screen.findByText("128")).toBeInTheDocument();
    expect(screen.getByText("Objects tracked")).toBeInTheDocument();
  });
});
