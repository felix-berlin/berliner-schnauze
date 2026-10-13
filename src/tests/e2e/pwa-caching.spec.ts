import { expect, test, type Page } from "@playwright/test";

// The service worker only exists in production builds (CI: build + `astro preview`).
// Against `astro dev` there is no SW — skip instead of reporting false failures.
async function waitForServiceWorkerControl(page: Page): Promise<boolean> {
  await page.goto("/");
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((r) => setTimeout(() => r(undefined), 10_000)),
    ]);
    if (!registration) return false;
    if (navigator.serviceWorker.controller) return true;
    await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r));
    return true;
  });
}

test.describe("PWA-Caching", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "SW behavior checked in Chromium");

  test.beforeEach(async ({ page }) => {
    test.skip(!(await waitForServiceWorkerControl(page)), "no service worker (dev server)");
  });

  test("uncached word page comes from the network, not the homepage fallback", async ({ page }) => {
    await page.goto("/wort/aasen");
    await expect(page.locator("h1 dfn")).toHaveText("aasen");
  });

  test("offline: visited page from the cache, unvisited page falls back to the homepage", async ({
    context,
    page,
  }) => {
    await page.goto("/wort/wa");
    await expect(page.locator("h1 dfn")).toHaveText("wa");

    await context.setOffline(true);

    await page.goto("/wort/wa");
    await expect(page.locator("h1 dfn")).toHaveText("wa");

    await page.goto("/wort/anmachen");
    await expect(page.locator("h1 dfn")).toHaveCount(0);
    await expect(page).toHaveURL(/\/wort\/anmachen$/);
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toBeVisible();

    await context.setOffline(false);
  });
});
