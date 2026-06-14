import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button (RTL)", () => {
  it("fires onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run scan</Button>);

    await user.click(screen.getByRole("button", { name: "Run scan" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("blocks clicks while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Run scan
      </Button>
    );

    const button = screen.getByRole("button", { name: "Run scan" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant + size token classes", () => {
    render(
      <Button variant="primary" size="lg">
        Go
      </Button>
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveClass("bg-cyan");
    expect(button).toHaveClass("h-12");
  });

  it("renders as the supplied child element with asChild while keeping button styling", () => {
    render(
      <Button asChild>
        <a href="/learn">Learn more</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Learn more" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveClass("rounded-md");
  });
});
