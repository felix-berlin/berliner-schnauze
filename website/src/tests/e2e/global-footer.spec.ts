import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { dismissToasts } from "./helpers";

// Footer v21 (docs/superpowers/specs/2026-11-22-footer-v21-design.md, handoff SPEC §14). Runs against the e2e seed
// (invented words: wa, anmachen, aasen, …), so the word sign always has several words to cycle through.
const footer = (page: Page) => page.getByRole("contentinfo");
const sign = (page: Page) => page.locator(".c-footer-word-sign");
const swapButton = (page: Page) => sign(page).getByRole("button", { name: "Noch eens" });

/** Scrolls the footer into view (the sign island hydrates on visible) and waits for "Noch eens". */
const reachFooter = async (page: Page, path = "/") => {
  await page.goto(path);
  await dismissToasts(page);
  await footer(page).scrollIntoViewIfNeeded();
  await expect(swapButton(page)).toBeVisible();
};

const lemma = (page: Page) => sign(page).getByRole("link").first();

test.describe("Footer v21", () => {
  test("links the internal pages, settings and the legal pages", async ({ page }) => {
    await page.goto("/");
    for (const href of [
      "/wort",
      "/themen",
      "/games/berliner-oder-nicht",
      "/magazin",
      "/wort-vorschlagen",
      "/spenden",
      "/changelog",
      "/impressum",
      "/datenschutz",
      "/settings",
    ]) {
      await expect(footer(page).locator(`a[href="${href}"]`).first()).toBeAttached();
    }
  });

  test("opens every external link in a new tab", async ({ page }) => {
    await page.goto("/");
    const external = footer(page).locator('a[href^="http"]');
    expect(await external.count()).toBeGreaterThanOrEqual(2);
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("has one footer landmark, h2 column headings and no h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(footer(page).locator("h1")).toHaveCount(0);
    await expect(footer(page).getByRole("heading", { level: 2 })).toHaveText([
      "Kiek ooch ma hier",
      "Unterstütz dit Projekt",
      "Über ditt Wörterbuch",
    ]);
  });

  test("Noch eens swaps the word, keeps the focus and the height", async ({ page }) => {
    await reachFooter(page);
    const button = swapButton(page);
    await button.focus();
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const before = await sign(page).evaluate((el) => (el as HTMLElement).offsetHeight);
      const first = (await lemma(page).textContent()) ?? "";
      seen.add(first);
      await button.click();
      await expect(lemma(page)).not.toHaveText(first);
      await expect(button).toBeFocused();
      const after = await sign(page).evaluate((el) => (el as HTMLElement).offsetHeight);
      const second = (await lemma(page).textContent()) ?? "";
      // Lemmas of up to 16 letters fit the reserved two-line height; longer ones (the 36-letter seed word) may grow the sign.
      if (first.length <= 16 && second.length <= 16) expect(after).toBe(before);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test("never shows the page's own word on its word page", async ({ page }) => {
    await reachFooter(page, "/wort/anmachen");
    for (let i = 0; i < 12; i++) {
      await expect(lemma(page)).not.toHaveAttribute("href", "/wort/anmachen");
      await swapButton(page).click();
    }
  });

  test("has no sign and no callout on the start page, but the Anki callout on /anki", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".c-footer-callout")).toHaveCount(0);
    await page.goto("/games/berliner-oder-nicht");
    await expect(page.locator(".c-footer-callout")).toHaveCount(0);
    await page.goto("/anki");
    await expect(page.locator(".c-footer-callout")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Na los, ab uff die Karten." })).toBeVisible();
    await expect(sign(page)).toHaveCount(0);
    await expect(
      footer(page).getByText("Schön, dass de da warst. Komm jut nach Hause."),
    ).toBeVisible();
  });

  test.describe("mobile 390px", () => {
    // The entry swing (rotate -9deg) is a transient overflow; the settled state is what must fit.
    test.use({ reducedMotion: "reduce", viewport: { height: 844, width: 390 } });

    test("every footer link and button is at least 44px tall and nothing overflows", async ({
      page,
    }) => {
      await reachFooter(page);
      const small = await footer(page)
        .locator("a, button")
        .evaluateAll((els) =>
          els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => ({
              h: el.getBoundingClientRect().height,
              t: (el.textContent ?? "").trim(),
            }))
            .filter(({ h }) => h < 43.5),
        );
      expect(small).toEqual([]);
      const overflowing = await footer(page).evaluate((root) =>
        [root, ...root.querySelectorAll("*")]
          .filter(
            (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5,
          )
          .map((el) => `${el.tagName}.${el.className}`),
      );
      expect(overflowing).toEqual([]);
    });
  });

  test("shows no text smaller than 13px", async ({ page }) => {
    await reachFooter(page);
    const tooSmall = await footer(page).evaluate((root) => {
      const found: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || !node.parentElement) continue;
        const size = parseFloat(getComputedStyle(node.parentElement).fontSize);
        if (size < 13 - 0.01) found.push(`${size}px: ${node.textContent.trim().slice(0, 30)}`);
      }
      return found;
    });
    expect(tooSmall).toEqual([]);
  });

  test("arms the entry animation and plays it once the footer is reached", async ({ page }) => {
    await reachFooter(page);
    await expect(sign(page)).toHaveAttribute("data-state", "in");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("renders the footer, the sign and the farewell fully visible, without the swap button", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(footer(page).locator('a[href="/impressum"]')).toBeAttached();
      await expect(sign(page).getByText("Wort für unterwegs")).toBeVisible();
      await expect(swapButton(page)).toBeHidden();
      await expect(footer(page).getByText("Tschüssi, wa!")).toHaveCSS("opacity", "1");
    });
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("runs no animation and leaves everything visible", async ({ page }) => {
      await reachFooter(page);
      await page.waitForTimeout(300);
      const running = await footer(page).evaluate((root) =>
        document
          .getAnimations()
          .filter(
            (a) => a.effect instanceof KeyframeEffect && root.contains(a.effect.target as Node),
          )
          .map((a) => (a as CSSAnimation).animationName ?? a.id),
      );
      expect(running).toEqual([]);
      await expect(sign(page)).toHaveCSS("opacity", "1");
      await expect(footer(page).getByText("Tschüssi, wa!")).toHaveCSS("opacity", "1");
    });
  });

  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of ["/", "/anki", "/wort/wa"]) {
      test(`passes axe on ${path} (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        if (path === "/anki") {
          // /anki has no sign: only wait for the footer itself.
          await page.goto(path);
          await footer(page).scrollIntoViewIfNeeded();
        } else {
          await reachFooter(page, path);
        }
        const { violations } = await new AxeBuilder({ page }).include("footer").analyze();
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
        ).toEqual([]);
      });
    }
  }
});
