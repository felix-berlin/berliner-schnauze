import { createHmac } from "node:crypto";

import { test, expect, type Page } from "@playwright/test";

// Wortseite v3 sweep (docs/design/wortseite/SPEC.md §11-14): overflow, headings, tab order, touch targets, reduced
// motion and the draft preview. Run against a fresh build: a stale service worker serves old CSS, so it is blocked.
test.use({ serviceWorkers: "block" });

const WORDS = {
  full: "anmachen",
  long: "rinnsteinschwalbenbeobachtungsposten",
  minimal: "wa",
} as const;
const WIDTHS = [390, 900, 1280] as const;

/** WebKit can miss the visibility callback of a short island while a sweep passes: visit what is left one by one. */
const visitLeftoverIslands = async (page: Page) => {
  const left = page.locator("astro-island[ssr]");
  for (let n = await left.count(); n > 0; n = await left.count()) {
    await left.first().scrollIntoViewIfNeeded();
    // Several islands can hydrate at once, so wait for any drop, not for exactly one.
    await expect.poll(() => left.count()).toBeLessThan(n);
  }
};

/** Scrolls through the page once so every client:visible island hydrates, then back to the top. */
const settle = async (page: Page, slug: string, width: number) => {
  await page.setViewportSize({ height: 900, width });
  await page.goto(`/wort/${slug}`);
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ behavior: "instant", top: y });
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await visitLeftoverIslands(page);
  await page.locator("#kommentare").getByRole("heading", { level: 2 }).waitFor();
  // No "networkidle": it never settled on this page in the first run (cause not investigated). Hydrated islands lose `ssr`.
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
};

const setDark = (page: Page, dark: boolean) =>
  page.evaluate((on) => document.documentElement.classList.toggle("dark", on), dark);

for (const [kind, slug] of Object.entries(WORDS)) {
  for (const width of WIDTHS) {
    test.describe(`${kind} (${slug}) at ${width}px`, () => {
      test("no horizontal overflow, light and dark", async ({ page }) => {
        await settle(page, slug, width);
        for (const dark of [false, true]) {
          await setDark(page, dark);
          const overflow = await page.evaluate(() => {
            const limit = document.documentElement.clientWidth;
            const wide = [...document.body.querySelectorAll<HTMLElement>("*")]
              .filter((el) => el.getBoundingClientRect().right > limit + 1)
              .filter((el) => !el.closest("[hidden], dialog:not([open])") && el.getClientRects().length)
              .slice(0, 5)
              .map((el) => `${el.tagName}.${el.className}`);
            return { limit, scrollWidth: document.documentElement.scrollWidth, wide };
          });
          expect(overflow.scrollWidth, `${dark ? "dark" : "light"}: ${overflow.wide.join(", ")}`).toBeLessThanOrEqual(
            overflow.limit,
          );
        }
      });

      test("exactly one h1, heading order h1 > h2, h3 only inside #analyse", async ({ page }) => {
        await settle(page, slug, width);
        await expect(page.locator("h1")).toHaveCount(1);
        const headings = await page.evaluate(() =>
          [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
            .filter((el) => el.getClientRects().length)
            .map((el) => ({
              analyse: !!el.closest("#analyse"),
              level: Number(el.tagName[1]),
              text: el.textContent?.trim().slice(0, 40) ?? "",
            })),
        );
        expect(headings[0]?.level).toBe(1);
        headings.forEach((h, i) => {
          const prev = headings[i - 1]?.level ?? 0;
          expect(h.level, `"${h.text}" follows h${prev}`).toBeLessThanOrEqual(prev + 1);
          if (h.level > 2) expect(h.analyse, `h${h.level} "${h.text}" outside #analyse`).toBe(true);
          expect(h.level, `"${h.text}"`).toBeLessThanOrEqual(3);
        });
      });

      test("every visible control is at least 44x44", async ({ page }) => {
        await settle(page, slug, width);
        // Without the root the sweep below would check nothing and pass.
        await expect(page.locator(".c-word-page")).toHaveCount(1);
        const small = await page.evaluate(() => {
          const controls = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"]';
          const root = document.querySelector(".c-word-page")!;
          const pseudo = (el: Element, which: "::before" | "::after") => {
            const s = getComputedStyle(el, which);
            return s.content === "none" || s.position !== "absolute"
              ? { h: 0, w: 0 }
              : { h: parseFloat(s.height) || 0, w: parseFloat(s.width) || 0 };
          };
          return [...(root.querySelectorAll<HTMLElement>(controls))]
            .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
            .map((el) => {
              const r = el.getBoundingClientRect();
              const b = pseudo(el, "::before");
              const a = pseudo(el, "::after");
              return {
                h: Math.max(r.height, b.h, a.h),
                inline: el.matches("a") && !!el.closest("p, dd, figcaption") && getComputedStyle(el).display === "inline",
                name: `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? "").trim().slice(0, 30)}"`,
                w: Math.max(r.width, b.w, a.w),
              };
            })
            // Allow-list: only an inline link inside running text (p, dd, figcaption) is exempt (WCAG 2.5.8 inline
            // exception). Any other exception needs its own selector here with a reason.
            .filter((c) => !c.inline && (c.w < 44 || c.h < 44))
            .map((c) => `${c.name} ${Math.round(c.w)}x${Math.round(c.h)}`);
        });
        expect(small).toEqual([]);
      });
    });
  }
}

test.describe("tab order (real Tab presses)", () => {
  // Reads which block holds the focused element; consecutive repeats collapse into one stop.
  const stop = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "none";
      if (el.closest('nav[aria-label="Inhalt der Wortseite"]')) return "tabs";
      if (el.closest(".c-word-sidebar")) return "sidebar";
      if (el.closest(".c-word-hero__actions")) {
        return el.getAttribute("aria-label") === "Weitere Aktionen" ? "menu" : "like";
      }
      if (el.matches('a[href="#n-trend"]')) return "trend";
      if (el.closest(".c-trend")) return "trendbox";
      if (el.closest(".c-themes")) return "themen";
      if (el.closest(".c-word-audio")) return "audio";
      if (el.closest(".c-word-images")) return "bilder";
      if (el.closest("#sagste-det-noch")) return "umfrage";
      return `other:${el.tagName.toLowerCase()}.${el.className}`;
    });

  const walk = async (page: Page, slug: string, width: number) => {
    await settle(page, slug, width);
    // Start right before the page content: the current breadcrumb link.
    await page.locator(".c-breadcrumbs__link.is-current").focus();
    const seen: string[] = [];
    for (let i = 0; i < 30 && seen.at(-1) !== "umfrage"; i++) {
      await page.keyboard.press("Tab");
      const s = await stop(page);
      if (seen.at(-1) !== s) seen.push(s);
    }
    return seen;
  };

  test("390px: Tabs, Like, ⋮, Trend, Themen, Trend-Box, Audio, Umfrage (anmachen)", async ({ page }) => {
    // Spec §14 (v3.1b) lists Like, Dislike (both are a "like" stop here, repeats collapse), ⋮, Themen-Links, Trend-Link. The trend badge sits between ⋮ and the Themen because DOM
    // order is the visual order (§5 and the mock: the badge row comes first, the Themen row sits below it); reordering
    // it by tabindex or CSS order would break WCAG 1.3.2 / 2.4.3 and a link would be hidden from keyboard users if skipped.
    expect(await walk(page, WORDS.full, 390)).toEqual(["tabs", "like", "menu", "trend", "themen", "trendbox", "audio", "umfrage"]);
  });

  test("1280px: Seitenleiste instead of Tabs (anmachen)", async ({ page }) => {
    expect(await walk(page, WORDS.full, 1280)).toEqual(["sidebar", "like", "menu", "trend", "themen", "trendbox", "audio", "umfrage"]);
  });

  // Spec deviation (§14 wants Audio -> Bilder): the images come first in the DOM (strip below 808px, hero column from
  // 808px), which is their visual position (§5, mock). Reordering with tabindex/order would break WCAG 1.3.2 / 2.4.3.
  // No word of the e2e seed has both audio and images, so only Bilder -> Umfrage is asserted.
  test("390px: Bilder before the poll (akademiebusen)", async ({ page }) => {
    expect(await walk(page, "akademiebusen", 390)).toEqual(["tabs", "like", "menu", "themen", "bilder", "umfrage"]);
  });
});

test.describe("long word", () => {
  test("six meanings: five shown, the rest behind a toggle with aria-expanded", async ({ page }) => {
    await settle(page, WORDS.long, 390);
    const hero = page.locator("#bedeutung");
    await expect(hero.locator("ol li:visible")).toHaveCount(5);
    const toggle = hero.getByRole("button", { name: "Alle 6 Bedeutungen zeigen" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(hero.locator("ol li:visible")).toHaveCount(6);
    // No way back (Task 4): the toggle is gone once everything is shown.
    await expect(hero.getByRole("button", { name: /Bedeutungen zeigen/ })).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Inhalt der Wortseite"]')).toBeVisible();
    await expect(page.locator("h1")).toBeInViewport();
  });
});

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no smooth scrolling, no shimmer, no lightbox fade", async ({ page }) => {
    await settle(page, "akademiebusen", 390); // hydrates the islands, the lightbox among them
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).not.toBe("smooth");

    // The skeleton only shows during a slow navigation: a probe element carries the same class.
    const shimmer = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "c-skeleton";
      document.body.append(probe);
      const name = getComputedStyle(probe).animationName;
      probe.remove();
      return name;
    });
    expect(shimmer).toBe("none");

    // Only one of the two image sections is in the accessibility tree (the other is display: none).
    const opener = page.getByRole("region", { name: "Bilder" }).getByRole("button", { name: /vergrößern/ }).first();
    const dialog = page.getByRole("dialog", { name: "Bildansicht" });
    await expect(async () => {
      await opener.click({ timeout: 1000 });
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    expect(await dialog.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001); // the global reduced-motion rule uses 0.00001s
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
  });

  test("with motion allowed the page does scroll smoothly", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "no-preference", serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto("/wort/wa");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
    await context.close();
  });
});

test.describe("draft preview (existing preview cookie flow)", () => {
  test("shows no vote, comment, pulse or trend", async ({ browserName, page }) => {
    // api/preview sets a Secure cookie in the production build; WebKit drops it over http://localhost.
    test.skip(browserName === "webkit", "WebKit does not keep Secure cookies over http");
    const secret = process.env.PAYLOAD_SECRET;
    expect(secret, "PAYLOAD_SECRET must match the server's").toBeTruthy();

    // alex is in the Top 10 and has the public blocks, so the contrast proves the draft really hides them.
    await page.goto("/wort/alex");
    await expect(page.locator("#n-trend")).toBeVisible();
    await expect(page.locator("#kommentare")).toBeAttached();
    const id = await page.locator("[data-pulse-word]").getAttribute("data-pulse-word");

    const data = `words.${id}.${Math.floor(Date.now() / 1000) + 600}`;
    const token = `${data}.${createHmac("sha256", secret!).update(data).digest("base64url")}`;
    const requests: string[] = [];
    // Leave the public page first: its islands still load data while we navigate away and would count as ours.
    await page.goto("about:blank");
    page.on("request", (r) => requests.push(new URL(r.url()).pathname));

    await page.goto(`/api/preview?token=${token}`);
    await expect(page).toHaveURL(/\/wort\/alex\?preview=/);
    await expect(page.locator("h1 dfn")).toHaveText("Alex");
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += 400) {
        window.scrollTo({ behavior: "instant", top: y });
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    await visitLeftoverIslands(page);
    // Every island hydrated (and so has fired its mount requests) before the "no requests" assertion below.
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);

    await expect(page.locator("#n-trend")).toHaveCount(0);
    await expect(page.locator(".c-badge--strong")).toHaveCount(0);
    await expect(page.locator("#sagste-det-noch")).toHaveCount(0);
    await expect(page.locator("#kommentare")).toHaveCount(0);
    await expect(page.locator(".c-reaction")).toHaveCount(0);
    await expect(page.locator("[data-pulse-word]")).toHaveCount(0);
    expect(requests.filter((p) => /^\/api\/(word-pulse|word-feedback|comments)/.test(p))).toEqual([]);
  });
});
