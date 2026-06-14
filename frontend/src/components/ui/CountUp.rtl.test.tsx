import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountUp } from "./CountUp";

describe("CountUp (RTL)", () => {
  it("always exposes its final target value to assistive tech", async () => {
    render(<CountUp to={42} />);
    // The screen-reader copy carries the settled value regardless of animation state.
    expect(await screen.findByText("42")).toBeInTheDocument();
  });

  it("formats the target value with the supplied formatter", async () => {
    render(<CountUp to={1280} format={(n) => `${Math.round(n)} km`} />);
    expect(await screen.findByText("1280 km")).toBeInTheDocument();
  });
});
