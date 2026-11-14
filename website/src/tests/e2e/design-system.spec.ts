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

test("form fields take the word page's dashed focus ring (--focus-ring-style)", async ({
  page,
}) => {
  // .c-input:focus-visible outranks the word page's :where() ring, so it reads the property.
  const focusRing = (root: string) =>
    page.evaluate((selector) => {
      const input = document.createElement("input");
      input.className = "c-input";
      document.querySelector(selector)!.append(input);
      input.focus();
      return getComputedStyle(input).outlineStyle;
    }, root);

  await page.goto("/wort/anmachen");
  expect(await focusRing(".o-word-page")).toBe("dashed");
  await page.goto("/");
  expect(await focusRing("main")).toBe("solid");
});

test("checkbox, radio and select on the word page take the dashed ring too", async ({ page }) => {
  // The shared field rule (not the text-field one) draws their ring; it reads the same property.
  await page.goto("/wort/anmachen");
  const styles = await page.evaluate(() => {
    const root = document.querySelector(".o-word-page")!;
    const make = (html: string) => {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const control = holder.firstElementChild as HTMLElement;
      root.append(control);
      control.focus({ focusVisible: true } as FocusOptions);
      return getComputedStyle(control).outlineStyle;
    };
    return [
      make('<input type="checkbox" class="c-input c-input--checkbox">'),
      make('<input type="radio" class="c-input c-input--radio">'),
      make('<select class="c-select"><option>a</option></select>'),
    ];
  });
  expect(styles).toEqual(["dashed", "dashed", "dashed"]);
});
