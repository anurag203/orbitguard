import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs, TabsPanel } from "./Tabs";

const items = [
  { value: "overview", label: "Overview" },
  { value: "details", label: "Details" }
];

describe("Tabs (RTL)", () => {
  it("shows the default panel and marks its tab selected", () => {
    render(
      <Tabs items={items} defaultValue="overview">
        <TabsPanel value="overview">Overview panel</TabsPanel>
        <TabsPanel value="details">Details panel</TabsPanel>
      </Tabs>
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Overview panel")).toBeInTheDocument();
    expect(screen.queryByText("Details panel")).not.toBeInTheDocument();
  });

  it("swaps the visible panel when another tab is selected", async () => {
    const user = userEvent.setup();
    render(
      <Tabs items={items} defaultValue="overview">
        <TabsPanel value="overview">Overview panel</TabsPanel>
        <TabsPanel value="details">Details panel</TabsPanel>
      </Tabs>
    );

    await user.click(screen.getByRole("tab", { name: "Details" }));

    expect(await screen.findByText("Details panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
  });
});
