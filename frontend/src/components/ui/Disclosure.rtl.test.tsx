import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ShowDetails } from "./Disclosure";

describe("Disclosure / ShowDetails (RTL)", () => {
  it("starts collapsed with aria-expanded=false and hidden content", () => {
    render(<ShowDetails>secret detail body</ShowDetails>);
    expect(screen.getByRole("button", { name: /show details/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("secret detail body")).not.toBeInTheDocument();
  });

  it("reveals content and flips aria-expanded when toggled open", async () => {
    const user = userEvent.setup();
    render(<ShowDetails>secret detail body</ShowDetails>);

    await user.click(screen.getByRole("button", { name: /show details/i }));

    expect(await screen.findByText("secret detail body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide details/i })).toHaveAttribute("aria-expanded", "true");
  });
});
