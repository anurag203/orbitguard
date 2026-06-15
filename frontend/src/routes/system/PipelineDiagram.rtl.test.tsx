import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ModeProvider, TooltipProvider } from "../../components/ui";
import { PipelineDiagram } from "./PipelineDiagram";

function renderPipeline(mode: "simple" | "pro") {
  return render(
    <MemoryRouter>
      <ModeProvider forceMode={mode}>
        <TooltipProvider>
          <PipelineDiagram />
        </TooltipProvider>
      </ModeProvider>
    </MemoryRouter>
  );
}

describe("PipelineDiagram", () => {
  it("keeps raw API paths out of Simple mode", () => {
    const { container } = renderPipeline("simple");

    expect(container.textContent).not.toMatch(/(?:GET|POST)\s+\/api/i);
    expect(screen.getByText(/scenario loader returns the chosen demo run/i)).toBeInTheDocument();
  });

  it("shows raw API paths and runtime chips in Pro mode", () => {
    renderPipeline("pro");

    expect(screen.getAllByText(/POST \/api\/scenarios\/\{id\}\/run/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/live in dev|snapshot on web/i).length).toBeGreaterThan(0);
  });
});
