import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "./ErrorState";

describe("ErrorState (RTL)", () => {
  it("announces via role=alert and shows the human message", () => {
    render(<ErrorState message="We couldn't reach the data service." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("We couldn't reach the data service.");
  });

  it("calls onRetry when the retry control is pressed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} retryLabel="Try again" />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry control when no onRetry is provided", () => {
    render(<ErrorState message="Boom" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
