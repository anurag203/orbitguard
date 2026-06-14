import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ModeProvider } from "./ModeProvider";
import { Term } from "./Term";
import { TooltipProvider } from "./Tooltip";

function renderTerm(node: ReactNode, mode: "simple" | "pro" = "simple") {
  return render(
    <MemoryRouter>
      <ModeProvider forceMode={mode}>
        <TooltipProvider>{node}</TooltipProvider>
      </ModeProvider>
    </MemoryRouter>
  );
}

describe("Term (RTL)", () => {
  it("renders the plain-language label as a keyboard-focusable link", async () => {
    const user = userEvent.setup();
    renderTerm(<Term k="miss-distance" />);

    // The plain word "How close" is the visible label (jargon is on demand).
    const trigger = screen.getByRole("link", { name: /how close/i });
    expect(trigger).toBeInTheDocument();

    await user.tab();
    expect(trigger).toHaveFocus();
  });

  it("reveals the plain-language definition on focus", async () => {
    const user = userEvent.setup();
    renderTerm(<Term k="miss-distance" />);

    await user.tab();

    // Radix opens the tooltip on keyboard focus; its body is the plain definition
    // (rendered both visibly and in a visually-hidden a11y copy, hence findAllBy).
    const revealed = await screen.findAllByText("The smallest gap between them.");
    expect(revealed.length).toBeGreaterThan(0);
  });
});
