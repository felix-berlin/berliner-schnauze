import { test, expect } from "@playwright/test";

// Regression test for a bug where clicking a c-word-sidebar anchor link briefly scrolled
// to the target section, then jumped back to the top of the page (a full page reload).
// Root cause: Astro's ClientRouter dispatches a synthetic popstate event with no `state`
// for same-page hash navigation, which our historyNavigationFallback listener mistook for
// an untracked navigation and force-reloaded on.
test.describe("Wort-Sidebar-Navigation (c-word-sidebar)", () => {
  test("Klick auf Sidebar-Link scrollt zur Section, ohne die Seite neu zu laden", async ({
    page,
  }) => {
    await page.goto("/wort/anmachen");

    // A marker that only survives if the page is NOT reloaded.
    await page.evaluate(() => {
      (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker = true;
    });

    await page.locator(".c-word-sidebar__link[href='#phonologie']").click();

    await expect(page).toHaveURL(/#phonologie$/);
    await expect(page.locator("#phonologie")).toBeInViewport();

    const markerSurvived = await page.evaluate(
      () => (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker === true,
    );
    expect(markerSurvived).toBe(true);

    // The scroll must stick — no bounce back to the top afterwards.
    await page.waitForTimeout(500);
    await expect(page.locator("#phonologie")).toBeInViewport();
  });
});
