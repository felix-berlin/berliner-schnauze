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
