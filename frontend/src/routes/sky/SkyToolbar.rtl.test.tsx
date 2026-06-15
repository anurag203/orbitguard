import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../../components/ui";
import { DEFAULT_FILTERS } from "./sky-data";
import { SkyToolbar } from "./SkyToolbar";

function renderToolbar(onSourceChange = vi.fn()) {
  return render(
    <TooltipProvider>
      <SkyToolbar
        filters={DEFAULT_FILTERS}
        onFiltersChange={vi.fn()}
        owners={["ISRO"]}
        countries={[{ value: "India (ISRO)", label: "India (ISRO)", count: 49 }]}
        clouds={[{ value: "cosmos-2251-debris", label: "Cosmos-2251", count: 587 }]}
        view="globe"
        onViewChange={vi.fn()}
        source="fixture"
        onSourceChange={onSourceChange}
        density="balanced"
        onDensityChange={vi.fn()}
        speed={120}
        onSpeedChange={vi.fn()}
        playing
        onPlayingChange={vi.fn()}
        onNotablePick={vi.fn()}
        onIsroView={vi.fn()}
      />
    </TooltipProvider>
  );
}

describe("SkyToolbar", () => {
  it("offers Live data even for the static build path", () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByRole("combobox", { name: /data source/i })).toHaveValue("fixture");
    expect(screen.getByRole("option", { name: /live data/i })).toBeInTheDocument();
  });

  it("emits source changes and exposes SATCAT filters", () => {
    const onSourceChange = vi.fn();
    renderToolbar(onSourceChange);

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /data source/i }), { target: { value: "live" } });
    expect(onSourceChange).toHaveBeenCalledWith("live");
    expect(screen.getByRole("option", { name: /India \(ISRO\) - 49/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Cosmos-2251 - 587/i })).toBeInTheDocument();
  });
});
