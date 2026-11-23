import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

// Word page v18 sweep: overflow, headings, touch targets, content variants (sparse, long, trend, audio), the legacy
// comment hashes, JSON-LD and the draft preview. The behaviour of the islands lives in word-v18.spec.ts.
// Run against a fresh build: a stale service worker serves old CSS, so it is blocked.
test.use({ serviceWorkers: "block" });

const WORDS = {
  full: "anmachen",
  long: "rinnsteinschwalbenbeobachtungsposten",
  minimal: "wa",
} as const;
const WIDTHS = [390, 900, 1280] as const;
const ROOT = ".o-word-v18";

/** Scrolls through the page once so every client:visible island hydrates, then back to the top. */
const settle = async (page: Page, slug: string, width: number) => {
  await page.setViewportSize({ height: 900, width });
  await page.goto(`/wort/${slug}`);
  await hydrate(page);
};

const hydrate = async (page: Page) => {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ behavior: "instant", top: y });
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  // WebKit can miss the visibility callback of a short island: visit what is left one by one.
  const left = page.locator("astro-island[ssr]");
  for (let n = await left.count(); n > 0; n = await left.count()) {
    await left.first().scrollIntoViewIfNeeded();
    await expect.poll(() => left.count()).toBeLessThan(n);
  }
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
};

const played = (page: Page) =>
  page.evaluate(() => (window as unknown as { played: string[] }).played);

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
              .filter(
                (el) => !el.closest("[hidden], dialog:not([open])") && el.getClientRects().length,
              )
              .slice(0, 5)
              .map((el) => `${el.tagName}.${el.className}`);
            return { limit, scrollWidth: document.documentElement.scrollWidth, wide };
          });
          expect(
            overflow.scrollWidth,
            `${dark ? "dark" : "light"}: ${overflow.wide.join(", ")}`,
          ).toBeLessThanOrEqual(overflow.limit);
        }
      });

      test("exactly one h1 and no skipped heading level", async ({ page }) => {
        await settle(page, slug, width);
        await expect(page.locator("h1")).toHaveCount(1);
        const levels = await page.evaluate(() =>
          [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
            .filter((el) => el.getClientRects().length)
            .map((el) => ({ level: Number(el.tagName[1]), text: el.textContent?.trim() ?? "" })),
        );
        expect(levels[0]?.level).toBe(1);
        levels.forEach((h, i) => {
          const prev = levels[i - 1]?.level ?? 0;
          expect(h.level, `"${h.text}" follows h${prev}`).toBeLessThanOrEqual(prev + 1);
        });
      });

      test("every visible control is at least 44x44", async ({ page }) => {
        await settle(page, slug, width);
        // Without the root the sweep below would check nothing and pass.
        await expect(page.locator(ROOT)).toHaveCount(1);
        const small = await page.evaluate((root) => {
          const controls =
            'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"]';
          const pseudo = (el: Element, which: "::before" | "::after") => {
            const s = getComputedStyle(el, which);
            return s.content === "none" || s.position !== "absolute"
              ? { h: 0, w: 0 }
              : { h: parseFloat(s.height) || 0, w: parseFloat(s.width) || 0 };
          };
          return (
            [...document.querySelector(root)!.querySelectorAll<HTMLElement>(controls)]
              .filter(
                (el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden",
              )
              .map((el) => {
                const r = el.getBoundingClientRect();
                const b = pseudo(el, "::before");
                const a = pseudo(el, "::after");
                return {
                  chip: el.matches("button.add, a.trend, .themes a"),
                  h: Math.max(r.height, b.h, a.h),
                  inline:
                    el.matches("a") &&
                    !!el.closest("p, dd, figcaption, li") &&
                    getComputedStyle(el).display === "inline",
                  name: `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? "").trim().slice(0, 30)}"`,
                  w: Math.max(r.width, b.w, a.w),
                };
              })
              // Allow-list: an inline link in running text (WCAG 2.5.8) and the chips SPEC §4.3 fixes below 44px (§17: the
              // "+ Ergänzen" pill 36px, the theme chip 30px, the trend badge; all 8px apart).
              .filter((c) => !c.inline && !c.chip && (c.w < 44 || c.h < 44))
              .map((c) => `${c.name} ${Math.round(c.w)}x${Math.round(c.h)}`)
          );
        }, ROOT);
        expect(small).toEqual([]);
      });
    });
  }
}

test.describe("content variants", () => {
  test("a sparse word renders its head and the fixed sections (wa)", async ({ page }) => {
    await page.goto("/wort/wa");
    await expect(page.locator("h1")).toContainText("wa");
    await expect(page.locator("#bedeutung")).toBeVisible();
    await expect(page.locator("#analyse")).toBeAttached();
    await expect(page.locator("#jeschichten")).toBeAttached();
  });

  test("a Top 10 word shows the trend badge, a word outside it does not (alex, wa)", async ({
    page,
  }) => {
    await page.goto("/wort/alex");
    await expect(page.locator(".c-word-badges .trend")).toContainText(/Platz 1/);
    await expect(page.locator(".c-word-head")).toContainText("Berolinismus");
    await page.goto("/wort/wa");
    await expect(page.locator(".c-word-badges .trend")).toHaveCount(0);
  });

  test("audio: the seal and an example voice play, no request before the first click", async ({
    browserName,
    page,
  }) => {
    // The CSP blocks the seed's media on localhost: play() is stubbed and records the src.
    await page.addInitScript(() => {
      (window as unknown as { played: string[] }).played = [];
      const sources = new WeakMap<HTMLMediaElement, string>();
      Object.defineProperty(HTMLMediaElement.prototype, "src", {
        get() {
          return sources.get(this) ?? this.getAttribute("src") ?? "";
        },
        set(value: string) {
          sources.set(this, value);
        },
      });
      HTMLMediaElement.prototype.play = function () {
        (window as unknown as { played: string[] }).played.push(this.src);
        return Promise.resolve();
      };
    });
    const audioRequests: string[] = [];
    page.on("request", (r) => /\.wav(\?|$)/.test(r.url()) && audioRequests.push(r.url()));
    await settle(page, "anmachen", 1280);

    const play = page.getByRole("button", { name: "anmachen anhören" });
    // WebKit loads the file up front although preload is "none".
    if (browserName !== "webkit") expect(audioRequests).toHaveLength(0);
    await play.click();
    await expect.poll(() => played(page)).toEqual([expect.stringContaining(".wav")]);

    // An example voice is a toggle in its own group.
    const example = page.getByRole("group", { name: "Beispiel 1 anhören" });
    await example.scrollIntoViewIfNeeded();
    const voice = example.getByRole("button", { name: "Männlich" });
    await voice.click();
    await expect(voice).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await played(page)).length).toBe(2);
    await voice.click();
    await expect(voice).toHaveAttribute("aria-pressed", "false");
  });

  test("a word with one voice shows one button (aasen)", async ({ page }) => {
    await page.goto("/wort/aasen");
    await expect(page.getByRole("button", { name: "aasen anhören" })).toHaveCount(1);
  });
});

test.describe("seo", () => {
  test("emits DefinedTerm and BreadcrumbList JSON-LD", async ({ page }) => {
    await page.goto("/wort/anmachen");
    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.flatMap((el) => JSON.parse(el.textContent ?? "{}")["@type"] ?? []));
    expect(types).toContain("DefinedTerm");
    expect(types).toContain("BreadcrumbList");
  });
});

test.describe("legacy comment links", () => {
  for (const hash of ["#kommentar-5", "#kommentare", "#antworten"]) {
    test(`${hash} lands on the Jeschichten`, async ({ page }) => {
      await page.goto(`/wort/anmachen${hash}`);
      await expect(page).toHaveURL(/#jeschichten$/);
      await expect(page.locator("#jeschichten")).toBeInViewport();
    });
  }
});

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no smooth scrolling", async ({ page }) => {
    await page.goto("/wort/wa");
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).not.toBe("smooth");
  });

  test("with motion allowed the page does scroll smoothly", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.goto("/wort/wa");
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe("smooth");
    await context.close();
  });
});

test("at 320px the headword stays on one line", async ({ page }) => {
  await page.setViewportSize({ height: 700, width: 320 });
  await page.goto(`/wort/${WORDS.full}`);
  const lineHeight = await page
    .locator(`${ROOT} h1`)
    .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  const box = await page.locator(`${ROOT} h1`).boundingBox();
  expect(box!.height).toBeLessThan(lineHeight * 1.5);
});

test.describe("draft preview (existing preview cookie flow)", () => {
  test("shows no poll, Jeschichten, trend or pulse and sends no write", async ({
    browserName,
    page,
  }) => {
    // api/preview sets a Secure cookie in the production build; WebKit drops it over http://localhost.
    test.skip(browserName === "webkit", "WebKit does not keep Secure cookies over http");
    const secret = process.env.PAYLOAD_SECRET;
    expect(secret, "PAYLOAD_SECRET must match the server's").toBeTruthy();

    // alex is in the Top 10 and has the public blocks, so the contrast proves the draft really hides them.
    await page.goto("/wort/alex");
    await expect(page.locator(".c-word-badges .trend")).toBeVisible();
    await expect(page.locator("#sagste")).toBeAttached();
    await expect(page.locator("#jeschichten")).toBeAttached();
    const id = await page.locator('meta[name="word-pulse"]').getAttribute("content");

    const data = `words.${id}.${Math.floor(Date.now() / 1000) + 600}`;
    const token = `${data}.${createHmac("sha256", secret!).update(data).digest("base64url")}`;
    const requests: string[] = [];
    // Leave the public page first: its islands still load data while we navigate away and would count as ours.
    await page.goto("about:blank");
    page.on("request", (r) => requests.push(new URL(r.url()).pathname));

    await page.goto(`/api/preview?token=${token}`);
    await expect(page).toHaveURL(/\/wort\/alex\?preview=/);
    await expect(page.locator("h1")).toContainText("Alex");
    await hydrate(page);

    await expect(page.locator(".c-word-badges .trend")).toHaveCount(0);
    await expect(page.locator("#sagste")).toHaveCount(0);
    await expect(page.locator("#jeschichten")).toHaveCount(0);
    await expect(page.locator(".c-word-poll")).toHaveCount(0);
    await expect(page.locator(".c-word-stories")).toHaveCount(0);
    await expect(page.locator('meta[name="word-pulse"]')).toHaveCount(0);
    expect(
      requests.filter((p) =>
        /^\/api\/(word-pulse|word-feedback|stories|contribute|comments)/.test(p),
      ),
    ).toEqual([]);
  });
});
