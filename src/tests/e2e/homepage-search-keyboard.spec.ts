import { test, expect, type Page } from "@playwright/test";

// Desktop-only: arrow-key navigation is driven by WordList.vue (onKeyStroke).
test.use({ viewport: { height: 900, width: 1280 } });
test.skip(({ isMobile }) => isMobile, "Keyboard navigation is desktop-only");

const searchbox = (page: Page) =>
  page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
const activeCard = (page: Page) => page.locator(".c-word-list article.is-active");

// "anmach" yields a small, stable result set that includes the required slug `anmachen`.
const searchAndFocusList = async (page: Page) => {
  await page.goto("/");
  await searchbox(page).fill("anmach");
  await expect(page.getByText(/^\d+ Ergebnisse$/)).not.toHaveText(/^0 /);
  await expect(page.locator(".c-word-list article").first()).toBeVisible();
};

test.describe("Search keyboard navigation and dropdown (/)", () => {
  test("Pfeiltasten bewegen die aktive Markierung", async ({ page }) => {
    await searchAndFocusList(page);

    await page.keyboard.press("ArrowDown");
    await expect(activeCard(page)).toHaveCount(1);
    const first = await activeCard(page).getAttribute("id");

    await page.keyboard.press("ArrowDown");
    await expect(activeCard(page)).not.toHaveAttribute("id", first ?? "");

    await page.keyboard.press("ArrowUp");
    await expect(activeCard(page)).toHaveAttribute("id", first ?? "");
  });

  test("Pfeiltasten verschieben den Fokus auf die aktive Karte", async ({ page }) => {
    await searchAndFocusList(page);

    await page.keyboard.press("ArrowDown");

    await expect(activeCard(page)).toBeFocused();
  });

  test("Enter öffnet das aktive Wort", async ({ page }) => {
    await searchAndFocusList(page);

    await page.keyboard.press("ArrowDown");
    const href = await activeCard(page).locator("a").first().getAttribute("href");
    expect(href).toMatch(/^\/wort\//);

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(new RegExp(`${href}`));
  });

  test("Jedes Suchergebnis hat ein Optionen-Dropdown mit Kopier-Aktionen", async ({
    context,
    page,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await searchAndFocusList(page);

    const cards = page.locator(".c-word-list article");
    const count = await cards.count();
    await expect(page.getByRole("button", { name: "Optionen" })).toHaveCount(count);

    await cards.first().getByRole("button", { name: "Optionen" }).click();

    await expect(
      page.getByRole("button", { name: "Link zum Wort kopieren" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Wort kopieren" }).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Wort kopieren" }).first()).toBeHidden();
  });

  test("Dropdown ist per Tastatur erreichbar und bedienbar", async ({ page }) => {
    await searchAndFocusList(page);

    await page.keyboard.press("ArrowDown");
    await activeCard(page).getByRole("button", { name: "Optionen" }).focus();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("button", { name: "Link zum Wort kopieren" }).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });
});
