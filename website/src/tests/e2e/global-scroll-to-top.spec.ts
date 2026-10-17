import { test, expect, type Page } from "@playwright/test";

const button = (page: Page) => page.locator(".c-scroll-to-top");
const scrollTo = (page: Page, y: number | "bottom") =>
  page.evaluate(
    (target) => window.scrollTo(0, target === "bottom" ? document.body.scrollHeight : target),
    y,
  );
const style = (page: Page) =>
  button(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, opacity: s.opacity, pointerEvents: s.pointerEvents };
  });

// "/" is short, so it already reaches the footer at 1200px; /wort/anmachen is a required slug.
for (const path of ["/", "/wort/anmachen"]) {
  test.describe(`ScrollToTop (${path})`, () => {
    test("ist ganz oben nicht sichtbar", async ({ page }) => {
      await page.goto(path);

      await expect(button(page)).toBeHidden();
    });

    test("ist mitten auf der Seite sichtbar und scrollt per Klick nach oben", async ({ page }) => {
      await page.goto(path);

      await scrollTo(page, 1200);
      await expect(button(page)).toBeVisible();

      await button(page).click();

      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(button(page)).toBeHidden();
    });

    test("am Seitenende: Desktop bleibt sichtbar, Mobil blendet aus", async ({
      isMobile,
      page,
    }) => {
      await page.goto(path);

      // Lists render after hydration and grow the page, so keep scrolling until the footer is reached.
      await expect(async () => {
        await scrollTo(page, "bottom");
        await expect(button(page)).toHaveClass(/is-close-to-end/, { timeout: 1000 });
      }).toPass();

      if (isMobile) {
        await expect.poll(() => style(page)).toMatchObject({ opacity: "0", pointerEvents: "none" });
      } else {
        await expect.poll(() => style(page)).toMatchObject({ opacity: "1", pointerEvents: "auto" });
      }
    });
  });
}
