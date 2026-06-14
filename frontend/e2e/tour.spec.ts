import { expect, test } from "@playwright/test";

// Regression guard for the "frozen on 1/5" tour bug: react-router v7's changing useNavigate()
// identity re-fired the reset effect on every advance, trapping the tour on step 0.

test.describe("Guided tour", () => {
  test("opens, advances through all five stops, and finishes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main#main")).toBeVisible();

    // Open the tour from the header.
    await page.getByRole("button", { name: "Tour" }).click();

    const dialog = page.getByRole("dialog", { name: "Guided tour" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 / 5");
    await expect(dialog).toContainText("Welcome to OrbitGuard");

    // Walk forward through the four remaining stops; URL + counter must actually advance.
    const stops: Array<{ url: RegExp; counter: string }> = [
      { url: /\/sky$/, counter: "2 / 5" },
      { url: /\/threats$/, counter: "3 / 5" },
      { url: /\/avoidance$/, counter: "4 / 5" },
      { url: /\/report$/, counter: "5 / 5" }
    ];

    for (const stop of stops) {
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(page).toHaveURL(stop.url);
      await expect(dialog).toContainText(stop.counter);
    }

    // Last stop shows Finish; clicking it closes the tour.
    await dialog.getByRole("button", { name: "Finish" }).click();
    await expect(dialog).toBeHidden();
  });

  test("syncs the step when navigating via the header, and Esc closes it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tour" }).click();

    const dialog = page.getByRole("dialog", { name: "Guided tour" });
    await expect(dialog).toBeVisible();

    // Jump straight to Threats via the primary nav; the tour card should follow to stop 3.
    await page.getByRole("link", { name: "Threats", exact: true }).first().click();
    await expect(page).toHaveURL(/\/threats$/);
    await expect(dialog).toContainText("3 / 5");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
