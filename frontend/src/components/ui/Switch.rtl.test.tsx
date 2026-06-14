import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModeProvider, useMode } from "./ModeProvider";
import { ModeToggle, Switch } from "./Switch";

function ModeProbe() {
  const { mode } = useMode();
  return <span data-testid="mode">{mode}</span>;
}

describe("ModeToggle / Switch (RTL)", () => {
  it("flips Simple ↔ Pro when toggled (reflected in a useMode() child)", async () => {
    const user = userEvent.setup();
    render(
      <ModeProvider>
        <ModeToggle />
        <ModeProbe />
      </ModeProvider>
    );

    const toggle = screen.getByRole("switch", { name: /pro mode/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("mode")).toHaveTextContent("simple");

    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByTestId("mode")).toHaveTextContent("pro");
  });

  it("invokes onCheckedChange and exposes its accessible label", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Show grid" />);

    const toggle = screen.getByRole("switch", { name: "Show grid" });
    await user.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not fire onCheckedChange when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Disabled toggle" disabled />);

    await user.click(screen.getByRole("switch", { name: "Disabled toggle" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
