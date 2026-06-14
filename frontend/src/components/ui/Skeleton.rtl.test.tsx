import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingState, Skeleton } from "./Skeleton";

describe("LoadingState / Skeleton (RTL)", () => {
  it("exposes a polite live status region with a plain message", () => {
    render(<LoadingState message="Loading the latest orbit data…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading the latest orbit data…");
  });

  it("marks bare skeletons aria-hidden so they are not announced", () => {
    render(<Skeleton data-testid="sk" width={120} height={40} />);
    expect(screen.getByTestId("sk")).toHaveAttribute("aria-hidden", "true");
  });
});
