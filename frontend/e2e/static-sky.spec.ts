import { expect, test } from "@playwright/test";

test("static Sky build offers the live catalog source", async ({ page }) => {
  test.skip(process.env.VITE_STATIC_API !== "1", "Run with VITE_STATIC_API=1 to exercise the static Sky contract.");

  await page.goto("/sky");
  await page.getByRole("button", { name: /filters/i }).click();

  const source = page.getByLabel(/data source/i);
  await expect(source).toHaveValue("fixture");
  await expect(source).toContainText(/live data/i);
  await expect(page.getByText("Snapshot")).toHaveCount(0);
});
