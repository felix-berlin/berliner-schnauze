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
  // SetColorMode.astro reads localStorage "darkMode" ("true" | "false") before first paint.
  await page.addInitScript(() => localStorage.setItem("darkMode", "false"));
  await page.goto("/");

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
      "@layer components { body { outline-color: rgb(2 2 2) } } @layer legacy { body { outline-color: rgb(1 1 1) } } " +
      "@layer base { body { letter-spacing: 2px } } @layer reset { body { letter-spacing: 1px } }",
  });
  // Both pairs are declared in the opposite of the wanted order. components/legacy: legacy is already known from the
  // app CSS, so that pair is only a guard. base/reset: the app CSS mentions base first, so without the inline order
  // statement reset would win; this pair fails when the statement is missing or not honoured after the navigation.
  expect(await page.evaluate(() => getComputedStyle(document.body).outlineColor)).toBe(
    "rgb(2, 2, 2)",
  );
  expect(await page.evaluate(() => getComputedStyle(document.body).letterSpacing)).toBe("2px");
});

test("the browser supports @scope (browser floor, spec §9/§14)", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => typeof CSSScopeRule !== "undefined")).toBe(true);
});

test("a card's part styles stop at its slot (Review Focus 4, spec §7.1)", async ({ page }) => {
  await page.goto("/wort/anmachen");
  const card = page.locator("#beispiele");
  const sizes = await card.evaluate((section) => {
    const slot = section.querySelector("[data-slot]");
    const own = section.querySelector("h2, h3");
    if (!slot || !own) throw new Error("card without slot or heading");
    // Slotted markup that happens to reuse a part name of the card.
    const foreign = document.createElement("span");
    foreign.className = "title";
    foreign.textContent = "fremd";
    slot.append(foreign);
    return {
      foreign: getComputedStyle(foreign).fontSize,
      own: getComputedStyle(own).fontSize,
    };
  });
  // Positive control: the card's own title is styled (--font-size-xl = 1.25rem = 20px), so the
  // difference below comes from the slot boundary, not from a renamed or resized title.
  expect(sizes.own).toBe("20px");
  expect(sizes.foreign).not.toBe(sizes.own);
});

test("one focus ring: dashed on the word page, solid elsewhere, form controls included", async ({
  page,
}) => {
  // base/_global.scss draws every ring; the word page and the fields only set --focus-ring-style/-color.
  // Reached with Tab, so :focus-visible holds in every engine (focus({ focusVisible }) does not in WebKit).
  const controls = [
    '<button type="button">x</button>',
    '<input class="c-input">',
    '<input type="checkbox" class="c-input c-input--checkbox">',
    '<input type="radio" class="c-input c-input--radio">',
    '<select class="c-select"><option>a</option></select>',
  ];
  const tabRing = async (root: string, html: string) => {
    await page.evaluate(
      ([selector, markup]) => {
        const start = document.createElement("button");
        start.id = "ring-start";
        const holder = document.createElement("div");
        holder.innerHTML = markup;
        const control = holder.firstElementChild!;
        control.id = "ring-probe";
        document.querySelector(selector)!.prepend(start, control);
      },
      [root, html],
    );
    await page.locator("#ring-start").focus();
    await page.keyboard.press("Tab");
    const probe = page.locator("#ring-probe");
    await expect(probe).toBeFocused();
    // Fields transition outline-color from currentColor: read the settled value.
    const ring = await probe.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
      const style = getComputedStyle(el);
      return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
    });
    await page.evaluate(() =>
      document.querySelectorAll("#ring-start, #ring-probe").forEach((el) => el.remove()),
    );
    return ring;
  };
  const rings = async (root: string) => {
    const result: string[] = [];
    for (const html of controls) result.push(await tabRing(root, html));
    return result;
  };

  await page.goto("/wort/anmachen");
  const focus = await resolveColor(page, "--color-focus-ring");
  // The text field draws its ring in --color-border-active (= --color-text-accent unless invalid).
  const accent = await resolveColor(page, "--color-text-accent");
  expect(await rings(".o-word-page")).toEqual([
    `dashed 2px ${focus}`,
    `dashed 2px ${accent}`,
    `dashed 2px ${focus}`,
    `dashed 2px ${focus}`,
    `dashed 2px ${focus}`,
  ]);

  await page.goto("/");
  expect(await rings("main")).toEqual([
    `solid 2px ${accent}`,
    `solid 2px ${accent}`,
    `solid 2px ${focus}`,
    `solid 2px ${focus}`,
    `solid 2px ${focus}`,
  ]);
});
