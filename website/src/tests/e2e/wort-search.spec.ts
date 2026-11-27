import { expect, test } from "@playwright/test";

test.describe("/wort search page", () => {
  test("redirects /suche with its query", async ({ request }) => {
    const res = await request.get("/suche?q=anmach&wortart=verb", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe("/wort?q=anmach&wortart=verb");
  });

  test("h1 is Wörter suchen", async ({ page }) => {
    await page.goto("/wort");
    await expect(page.getByRole("heading", { level: 1, name: "Wörter suchen" })).toBeVisible();
  });

  test("robots: index without query, noindex with q", async ({ page }) => {
    await page.goto("/wort");
    await expect(page.locator('meta[name="robots"][content="index, follow"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/wort$/);
    await page.goto("/wort?q=anmach");
    await expect(page.locator('meta[name="robots"][content="noindex, follow"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await page.goto("/wort?buchstabe=a");
    await expect(page.locator('meta[name="robots"][content="noindex, follow"]')).toHaveCount(1);
  });

  test("different queries do not share cached HTML", async ({ request }) => {
    const a = await (await request.get("/wort?q=anmach")).text();
    const b = await (await request.get("/wort?q=abjang")).text();
    expect(a).toContain("Treffer für „anmach“");
    expect(b).toContain("Treffer für „abjang“");
    expect(b).not.toContain("„anmach“");
  });

  test.describe("without JS", () => {
    test.use({ javaScriptEnabled: false });

    test("lists hits for ?q= and links the register", async ({ page }) => {
      await page.goto("/wort?q=anmach");
      await expect(page.getByRole("link", { name: /anmachen/i }).first()).toBeVisible();
      await expect(page.getByRole("search")).toBeVisible();
      await page.goto("/wort");
      await expect(page.locator('a[href="/wort?buchstabe=a"]')).toHaveCount(1);
    });
  });
});
