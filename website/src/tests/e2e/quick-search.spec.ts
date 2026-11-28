import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Quick search dialog (docs/design/suche-v1/SPEC.md §18–§27), against the seed:e2e words only.
test.use({ serviceWorkers: "block" });

const HISTORY_KEY = "schnellsuche-verlauf";
const dialog = (page: Page) => page.getByRole("dialog", { name: "Schnellsuche" });
const field = (page: Page) =>
  dialog(page).getByRole("combobox", { name: "Wort oder Bedeutung suchen" });
const trigger = (page: Page) => page.getByRole("button", { name: "Suche aktivieren" });

/** Opens a page with the header island hydrated (client:idle) and an optional history. */
async function visit(page: Page, path = "/wort/anmachen", history?: string[]) {
  if (history)
    await page.addInitScript(
      ([key, list]) => localStorage.setItem(key as string, JSON.stringify(list)),
      [HISTORY_KEY, history] as const,
    );
  await page.goto(path);
  await expect(page.locator("astro-island[ssr]:has(.c-searchbar)")).toHaveCount(0);
}

/** Opens the dialog with the header button and waits for the panel (loaded on the first open). */
async function openDialog(page: Page) {
  await trigger(page).click();
  await expect(field(page)).toBeFocused();
}

/** Types and waits until the list answers that query. */
async function search(page: Page, q: string) {
  await field(page).fill(q);
  await expect(dialog(page).getByRole("option").last()).toContainText(/Treffer|vorschlagen/);
}

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).include(".c-quick-search").analyze();
  return violations.map(
    (v) =>
      `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} (${n.failureSummary})`).join(" | ")}`,
  );
};

/** Visible elements in the dialog with their own text below 13px (global constraint). */
const smallText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".c-quick-search *")]
      .filter(
        (el) =>
          [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) &&
          el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
          parseFloat(getComputedStyle(el).fontSize) < 13,
      )
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}: ${getComputedStyle(el).fontSize}`),
  );

test.describe("quick search, desktop", () => {
  test.use({ viewport: { height: 900, width: 1280 } });

  test("opens with / and Ctrl+K, not from a field; the page behind is inert", async ({ page }) => {
    await visit(page);
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    // Native modal: nothing behind it takes focus.
    const behind = await page.evaluate(() => {
      const link = document.querySelector<HTMLElement>("main a[href]")!;
      link.focus();
      return document.activeElement === link;
    });
    expect(behind).toBe(false);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();

    await page.keyboard.press("Control+k");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");

    await visit(page, "/wort-vorschlagen");
    const input = page.getByRole("main").getByRole("textbox").first();
    await input.click();
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeHidden();
    await expect(input).toHaveValue(/\//);
  });

  test("on the search page / focuses the page field, no dialog", async ({ page }) => {
    await visit(page, "/wort");
    await expect(page.locator("astro-island[ssr]:has(.c-search-app)")).toHaveCount(0, {
      timeout: 15_000,
    });
    await page.keyboard.press("/");
    await expect(
      page.getByRole("main").getByRole("combobox", { name: "Wort oder Bedeutung suchen" }),
    ).toBeFocused();
    await expect(dialog(page)).toBeHidden();
  });

  test("empty state: no row active, ↓ picks the first, Entf removes the history entry", async ({
    page,
  }) => {
    await visit(page, "/wort/anmachen", ["anmachen", "wa"]);
    await openDialog(page);
    const history = dialog(page).getByRole("group", { name: "Zuletzt jesucht" });
    await expect(history.getByRole("option")).toHaveCount(2);
    await expect(dialog(page).getByRole("group", { name: "Heute" })).toBeVisible();
    await expect(dialog(page).getByRole("group", { name: "Gerade beliebt" })).toBeVisible();
    await expect(field(page)).not.toHaveAttribute("aria-activedescendant");

    await page.keyboard.press("ArrowDown");
    await expect(field(page)).toHaveAttribute(
      "aria-activedescendant",
      (await history.getByRole("option").first().getAttribute("id"))!,
    );
    await expect(dialog(page).getByText("aus Verlauf entfernen")).toBeVisible();
    await page.keyboard.press("Delete");
    await expect(history.getByRole("option")).toHaveCount(1);
    await expect(history.getByRole("option")).toHaveText("wa");
    expect(await page.evaluate((k) => localStorage.getItem(k), HISTORY_KEY)).toBe('["wa"]');
  });

  test("hits: groups, Ctrl+Enter and „Alle 4 Treffer anzeigen“ go to /wort?q=", async ({
    page,
  }) => {
    await visit(page);
    await openDialog(page);
    await search(page, "anmach");
    await expect(
      dialog(page).getByRole("group", { name: "Im Wort" }).getByRole("option"),
    ).toHaveCount(4);
    const all = dialog(page).getByRole("option", { name: /Alle 4 Treffer anzeigen/ });
    await expect(all).toBeVisible();
    // First hit preselected (SPEC §21.2), with the ↵ key.
    await expect(field(page)).toHaveAttribute(
      "aria-activedescendant",
      (await dialog(page).getByRole("option").first().getAttribute("id"))!,
    );

    await page.keyboard.press("Control+Enter");
    await expect(page).toHaveURL(/\/wort\?q=anmach$/);
    await expect(dialog(page)).toBeHidden();

    await openDialog(page);
    await expect(field(page)).toHaveValue(""); // empty on reopen
    await search(page, "anmach");
    await all.click();
    await expect(page).toHaveURL(/\/wort\?q=anmach$/);
  });

  test("Enter opens the word and puts the query into the history", async ({ page }) => {
    await visit(page, "/wort/wa");
    await openDialog(page);
    await search(page, "anmachen");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/wort\/anmachen$/);
    await expect(dialog(page)).toBeHidden();
    await openDialog(page);
    await expect(
      dialog(page).getByRole("group", { name: "Zuletzt jesucht" }).getByRole("option"),
    ).toHaveText(["anmachen"]);
  });

  test("Esc clears, then closes; focus goes back to the trigger; Tab stays inside", async ({
    page,
  }) => {
    await visit(page);
    await openDialog(page);
    await search(page, "anmach");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest(".c-quick-search"),
      );
      expect(inside, `Tab ${i + 1} left the dialog`).toBe(true);
    }
    await field(page).focus();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toHaveValue("");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test("the scrim closes on a click and does not scroll the page", async ({ page }) => {
    await visit(page);
    await openDialog(page);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(100, 700);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
    await page.mouse.click(100, 700);
    await expect(dialog(page)).toBeHidden();
  });

  test("axe and font sizes: empty, typing, nothing found", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/wort/anmachen", ["anmachen"]);
    await openDialog(page);
    await expect(dialog(page).getByRole("group", { name: "Zuletzt jesucht" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    expect(await smallText(page)).toEqual([]);
    await search(page, "anmach");
    expect(await axe(page)).toEqual([]);
    expect(await smallText(page)).toEqual([]);
    await search(page, "qqqxx");
    await expect(
      dialog(page).getByRole("heading", { name: "Nüscht jefunden für „qqqxx“" }),
    ).toBeVisible();
    await expect(dialog(page).locator('[aria-live="polite"]')).toHaveText("Keene Treffer");
    expect(await axe(page)).toEqual([]);
    expect(await smallText(page)).toEqual([]);
  });
});

test.describe("quick search, mobile 390", () => {
  test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

  test("the header button opens the full-screen dialog; Abbrechen closes; axe clean", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/wort/anmachen", ["anmachen"]);
    await openDialog(page);
    const box = await dialog(page).getByRole("listbox").boundingBox();
    // Full screen: the list is as wide as the dialog, which covers the viewport (beside a classic scrollbar).
    const full = await dialog(page).boundingBox();
    expect(box!.width).toBe(full!.width);
    expect(full!.width).toBeGreaterThanOrEqual(375);
    await expect(field(page)).toHaveAttribute("placeholder", "Wort oder Bedeutung");
    expect(await axe(page)).toEqual([]);
    expect(await smallText(page)).toEqual([]);
    await search(page, "anmach");
    expect(await axe(page)).toEqual([]);
    expect(await smallText(page)).toEqual([]);
    await dialog(page).getByRole("button", { name: "Abbrechen" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});
