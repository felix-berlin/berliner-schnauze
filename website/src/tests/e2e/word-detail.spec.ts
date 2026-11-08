import { test, expect } from "@playwright/test";

test.describe("Wort-Detailseite (/wort/<slug>)", () => {
  test("spärliches Wort rendert ohne zu brechen (wa)", async ({ page }) => {
    const response = await page.goto("/wort/wa");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/^wa auf Berlinerisch/);
    await expect(page.locator("h1 dfn")).toHaveText("wa");
    await expect(page.locator("#etymologie")).toBeVisible();
    await expect(page.locator("#etymologie")).toContainText("Bedeutung");
  });

  test("umfangreiches Wort zeigt vollständige Phonologie-Section (anmachen)", async ({ page }) => {
    await page.goto("/wort/anmachen");

    await expect(page.locator("h1 dfn")).toHaveText("anmachen");

    const phonologie = page.locator("#phonologie");
    await expect(phonologie).toBeVisible();
    await expect(
      phonologie.getByRole("heading", { name: "Ähnlich klingende Wörter" }),
    ).toBeVisible();
    await expect(phonologie.getByRole("heading", { name: "Ähnlich geschrieben" })).toBeVisible();
    await expect(phonologie.getByRole("link").first()).toHaveAttribute("href", /^\/wort\//);

    const grammatikTags = page.locator("#grammatik .c-section-card__grammar-tag");
    await expect(grammatikTags).toHaveCount(3);
  });

  test("Wort mit mehreren Bedeutungen und historischem Infotext (aasen)", async ({ page }) => {
    await page.goto("/wort/aasen");

    await expect(page.locator("h1 dfn")).toHaveText("aasen");

    const etymologie = page.locator("#etymologie");
    await expect(etymologie.locator(".c-single-word__translation-list li")).toHaveCount(2);
    await expect(etymologie.locator(".c-section-card__infotext")).toBeVisible();
    await expect(etymologie.locator(".c-section-card__infotext")).not.toBeEmpty();
  });

  test("Wort mit Bildergalerie (akademiebusen)", async ({ page }) => {
    await page.goto("/wort/akademiebusen");

    await expect(page.locator("h1 dfn")).toHaveText("Akademiebusen");

    const gallery = page.getByRole("complementary", { name: "Bildergalerie" });
    await expect(gallery).toBeVisible();
    await expect(gallery.locator("img").first()).toBeVisible();
  });

  test("Wort mit Verwandte-Worte-Section (ballast-der-republik)", async ({ page }) => {
    await page.goto("/wort/ballast-der-republik");

    await expect(page.locator("h1 dfn")).toHaveText("Ballast der Republik");

    const verwandteWorte = page.locator("#verwandte-worte");
    await expect(verwandteWorte).toBeVisible();
    await expect(verwandteWorte.getByRole("link").first()).toHaveAttribute("href", /^\/wort\//);
  });

  test("Wort mit Anagramme-Section (alsche)", async ({ page }) => {
    await page.goto("/wort/alsche");

    await expect(page.locator("h1 dfn")).toHaveText("Alsche");
    await expect(page.getByRole("heading", { name: "Buchstabenspiele" })).toBeVisible();

    const anagramme = page.locator("#anagramme");
    await expect(anagramme).toBeVisible();
    await expect(anagramme.getByRole("link", { name: "schale" })).toHaveAttribute(
      "href",
      "/wort/schale",
    );
  });

  test("Wort mit Berolinismus-Badge (alex)", async ({ page }) => {
    await page.goto("/wort/alex");

    await expect(page.locator("h1 dfn")).toHaveText("Alex");
    await expect(
      page.locator(".c-word-hero__badges .c-badge", { hasText: "Berolinismus" }),
    ).toBeVisible();
  });

  test("Smoke-Check: Wortseite lädt mit Breadcrumb und ohne 404 (wa)", async ({ page }) => {
    const response = await page.goto("/wort/wa");
    expect(response?.status()).toBe(200);

    await expect(page.locator(".c-word-hero__title")).toHaveCount(1);
    const breadcrumb = page.getByRole("navigation", { name: "breadcrumbs" });
    await expect(breadcrumb.getByRole("link").last()).toHaveText("Wa");
  });

  test("mobile: Tab-Leiste statt Seitenleiste, Tab scrollt zum Anker (anmachen)", async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 });
    await page.goto("/wort/anmachen");

    const tabbar = page.getByRole("navigation", { name: "Inhalt der Wortseite" });
    await expect(tabbar).toBeVisible();
    await expect(page.locator(".c-word-sidebar")).toBeHidden();

    await tabbar.getByRole("link", { name: "Analyse" }).click();
    await expect(page).toHaveURL(/#analyse$/);
    await expect(page.locator("#analyse")).toBeInViewport();
  });

  test("Desktop: Seitenleiste statt Tab-Leiste (anmachen)", async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 1280 });
    await page.goto("/wort/anmachen");

    await expect(page.locator(".c-word-sidebar")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Inhalt der Wortseite" })).toBeHidden();
  });

  test.describe("Hero v3", () => {
    test("Bedeutungen als Liste, Wortart-Badge, Kategorie-Link (anmachen)", async ({ page }) => {
      await page.setViewportSize({ height: 800, width: 1280 });
      await page.goto("/wort/anmachen");

      const hero = page.locator("#bedeutung");
      await expect(hero.locator("h1 dfn")).toHaveText("anmachen");
      await expect(hero.locator(".t-label")).toHaveText("Bedeutungen");
      await expect(hero.locator("ol.c-meanings li")).toHaveText([
        "einschalten",
        "sich jemandem forsch nähern",
      ]);
      await expect(hero.locator(".c-badge").first()).toHaveText(/\S/);
      await expect(hero.locator('a[href^="/themen/"]').first()).toBeVisible();
    });

    test("einzelne Bedeutung als Absatz (wa)", async ({ page }) => {
      await page.goto("/wort/wa");
      const hero = page.locator("#bedeutung");
      await expect(hero.locator(".t-label")).toHaveText("Bedeutung");
      await expect(hero.locator("p.t-em")).toHaveText("nicht wahr");
      await expect(hero.locator("ol.c-meanings")).toHaveCount(0);
    });

    test("Tab-Reihenfolge: Like, Menü, Trend-Badge, Kategorie", async ({ page }) => {
      await page.setViewportSize({ height: 800, width: 1280 });
      await page.goto("/wort/anmachen");
      const hero = page.locator("#bedeutung");
      await expect(hero.getByRole("button", { name: /^Jefällt ma/ })).toBeVisible();

      await hero.getByRole("button", { name: /^Jefällt ma/ }).focus();
      // Focus on the group reveals Dislike, which is part of the order (Spec §14).
      await page.keyboard.press("Tab");
      await expect(hero.getByRole("button", { name: /^Nee/ })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(hero.getByRole("button", { name: "Weitere Aktionen" })).toBeFocused();
      // anmachen is trending: the badge row starts with the trend badge (Spec §5), then the category.
      await page.keyboard.press("Tab");
      await expect(hero.locator('a[href="#n-trend"]')).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(hero.locator('a[href^="/themen/"]').first()).toBeFocused();
    });

    test("Desktop: Dislike erscheint erst bei Hover auf die Gruppe", async ({ page }) => {
      await page.setViewportSize({ height: 800, width: 1280 });
      await page.goto("/wort/anmachen");
      const hero = page.locator("#bedeutung");
      const like = hero.getByRole("button", { name: /^Jefällt ma/ });
      const dislike = hero.getByRole("button", { name: /^Nee/ });
      await expect(like).toBeVisible();
      await expect(dislike).toBeHidden();
      await like.hover();
      await expect(dislike).toBeVisible();
      await page.mouse.move(5, 400);
      await expect(dislike).toBeHidden();
    });

    test("Touch: Dislike bleibt versteckt", async ({ browser, browserName }) => {
      test.skip(browserName !== "chromium", "isMobile is not available in Firefox");
      const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        hasTouch: true,
        isMobile: true,
        viewport: { height: 800, width: 390 },
      });
      const page = await context.newPage();
      await page.goto("/wort/anmachen");
      const hero = page.locator("#bedeutung");
      await expect(hero.getByRole("button", { name: /^Jefällt ma/ })).toBeVisible();
      await expect(hero.getByRole("button", { name: /^Nee/ })).toBeHidden();
      await context.close();
    });

    test("Menü: Wort kopieren zeigt Haken statt Toast, Esc gibt den Fokus zurück", async ({
      browserName,
      context,
      page,
    }) => {
      test.skip(browserName !== "chromium", "clipboard permissions differ per browser");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.setViewportSize({ height: 800, width: 1280 });
      await page.goto("/wort/anmachen");

      const hero = page.locator("#bedeutung");
      const trigger = hero.getByRole("button", { name: "Weitere Aktionen" });
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const menu = page.getByRole("menu", { name: "Weitere Aktionen" });
      await expect(menu.getByRole("menuitem")).toHaveText([
        "Wort teilen",
        "Link kopieren",
        "Wort kopieren",
      ]);

      await menu.getByRole("menuitem", { name: "Wort kopieren" }).click();
      await expect(menu.getByRole("menuitem", { name: "Wort kopiert" })).toHaveAttribute(
        "data-done",
        "true",
      );
      await expect(page.locator(".c-toast-notify")).toHaveCount(0);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("anmachen");
      await expect(menu.getByRole("menuitem", { name: "Wort kopieren" })).toBeVisible({
        timeout: 4000,
      });

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  });

  test("Trend-Kasten und Badge für ein Wort in den Top 10 (alex)", async ({ page }) => {
    await page.goto("/wort/alex");

    const badge = page.locator(".c-word-hero .c-badge--strong");
    await expect(badge).toHaveText(/Im Trend · Platz 1/);
    const box = page.locator("#n-trend");
    await expect(box).toBeVisible();
    await expect(box).toContainText("Trendet jerade");
    await expect(box).toContainText("Platz 1 diese Woche");
    // Pulse views of other tests change the numbers, so only the shape is asserted.
    await expect(box).toContainText(/\d+ Aufrufe in 7 Tagen · [+−±]\d+ % zur Vorwoche/);
    await expect(box.locator(".c-trend__bars")).toHaveAttribute("aria-hidden", "true");
    await expect(box.locator(".c-trend__bars span")).toHaveCount(7);
  });

  test("Wort außerhalb der Top 10 hat weder Trend-Kasten noch Badge (wa)", async ({ page }) => {
    await page.goto("/wort/wa");

    await expect(page.locator("h1 dfn")).toHaveText("wa");
    await expect(page.locator("#n-trend")).toHaveCount(0);
    await expect(page.locator(".c-badge--strong")).toHaveCount(0);
  });

  test.describe("Audio „Anhören“", () => {
    // The CSP (media-src: the production CMS host) blocks the seed's media on localhost, so playback is stubbed: play()
    // resolves and records the src (the src setter is stubbed too). What the test covers is the UI state and the single shared player.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { played: string[] }).played = [];
        // A real src would load, hit the CSP and fire `error`, which resets the player.
        const sources = new WeakMap<HTMLMediaElement, string>();
        Object.defineProperty(HTMLMediaElement.prototype, "src", {
          get() {
            return sources.get(this) ?? "";
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
    });

    test("Wort mit beiden Stimmen: eine Stimme zugleich, auch über Beispiele hinweg (anmachen)", async ({ page }) => {
      const audioRequests: string[] = [];
      page.on("request", (request) => /\.wav(\?|$)/.test(request.url()) && audioRequests.push(request.url()));
      await page.goto("/wort/anmachen");

      const row = page.getByRole("group", { exact: true, name: "Anhören" });
      await expect(row).toBeVisible();
      await expect(page.getByText("Anhören", { exact: true })).toHaveCount(1);
      const male = row.getByRole("button", { name: "Männlich" });
      const female = row.getByRole("button", { name: "Weiblich" });
      await expect(male).toHaveAttribute("aria-pressed", "false");
      // Sits after the hero, before the poll; preload="none": no audio request before the first click.
      expect(audioRequests).toHaveLength(0);

      // client:visible: a click before hydration would hit the plain server markup.
      await expect(page.locator("astro-island[component-url*='WordAudio']")).not.toHaveAttribute("ssr", "");
      await male.click();
      await expect(male).toHaveAttribute("aria-pressed", "true");
      await female.click();
      await expect(female).toHaveAttribute("aria-pressed", "true");
      await expect(male).toHaveAttribute("aria-pressed", "false");
      expect(await page.evaluate(() => (window as unknown as { played: string[] }).played)).toEqual([
        expect.stringContaining("stimme-m.wav"),
        expect.stringContaining("stimme-w.wav"),
      ]);

      const example = page.getByRole("group", { name: "Beispiel 1 anhören" });
      await example.scrollIntoViewIfNeeded();
      await expect(page.locator("astro-island[component-url*='VoiceButtons']:not([component-url*='WordAudio'])").first()).not.toHaveAttribute("ssr", "");
      await example.getByRole("button", { name: "Männlich" }).click();
      await expect(example.getByRole("button", { name: "Männlich" })).toHaveAttribute("aria-pressed", "true");
      await expect(female).toHaveAttribute("aria-pressed", "false");
      await example.getByRole("button", { name: "Männlich" }).click();
      await expect(example.getByRole("button", { name: "Männlich" })).toHaveAttribute("aria-pressed", "false");
      // The second example has no audio.
      await expect(page.getByRole("group", { name: "Beispiel 2 anhören" })).toHaveCount(0);
    });

    test("Wort mit einer Stimme zeigt einen Button (aasen)", async ({ page }) => {
      await page.goto("/wort/aasen");
      const row = page.getByRole("group", { exact: true, name: "Anhören" });
      await expect(row.getByRole("button")).toHaveCount(1);
      await expect(row.getByRole("button", { name: "Männlich" })).toBeVisible();
    });

    test("Wort ohne Audio hat weder Zeile noch Beschriftung (wa)", async ({ page }) => {
      await page.goto("/wort/wa");
      await expect(page.locator("h1 dfn")).toHaveText("wa");
      await expect(page.getByText("Anhören", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("group", { exact: true, name: "Anhören" })).toHaveCount(0);
    });
  });
});
