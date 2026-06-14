import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders a native button with the label and type=button by default", () => {
    const html = renderToStaticMarkup(<Button>Click me</Button>);
    expect(html).toContain("<button");
    expect(html).toContain("Click me");
    expect(html).toContain('type="button"');
  });

  it("keeps a plain label + aria-busy while loading (never a bare spinner)", () => {
    const html = renderToStaticMarkup(
      <Button loading loadingText="Scanning…">
        Go
      </Button>
    );
    expect(html).toContain("Scanning…");
    expect(html).toContain("aria-busy");
    expect(html).toContain("animate-spin");
  });

  it("applies the primary token class and disables when disabled", () => {
    expect(renderToStaticMarkup(<Button variant="primary">Go</Button>)).toContain("bg-cyan");
    expect(renderToStaticMarkup(<Button disabled>Go</Button>)).toContain("disabled");
  });
});
