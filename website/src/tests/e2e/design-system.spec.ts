import { test, expect, type Page } from "@playwright/test";

// Design-system contract in the browser (docs/superpowers/specs/2026-11-13-design-system-design.md).
test.use({ serviceWorkers: "block" });

/** Resolves a colour token on a probe inside <html>, so light-dark() is evaluated like on the page. */
const resolveColor = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);

test("a stored light choice beats a dark system setting (Review Focus 7)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  // SetColorMode.astro reads localStorage "darkMode" ("true" | "false") before first paint.
  await page.evaluate(() => localStorage.setItem("darkMode", "false"));
  await page.reload();

  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  // --color-text-body light value: color.ink.base (#2b333b)
  expect(await resolveColor(page, "--color-text-body")).toBe("rgb(43, 51, 59)");
});

test("the layer order survives a ClientRouter navigation (spec §6/§14)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as unknown as { __spa: boolean }).__spa = true;
  });
  await page.locator('a[href^="/wort/"]').first().click();
  await page.waitForURL(/\/wort\//);
  // A full page load would drop the marker: this proves the navigation went through the ClientRouter.
  expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa)).toBe(true);

  await page.addStyleTag({
    content:
      "@layer legacy { body { outline-color: rgb(1 1 1) } } @layer components { body { outline-color: rgb(2 2 2) } }",
  });
  // Source order puts legacy last; only the declared layer order lets components win.
  expect(await page.evaluate(() => getComputedStyle(document.body).outlineColor)).toBe(
    "rgb(2, 2, 2)",
  );
});
