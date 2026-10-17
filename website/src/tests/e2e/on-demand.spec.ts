import { expect, test } from "@playwright/test";

// Pages, the sitemap, OG images and the word of the day render from the database on every request.
test.describe("On-demand routes", () => {
  for (const path of [
    "/wort/doesnotexist",
    "/wort/AASEN",
    "/wort/%C3%84rger",
    "/themen/doesnotexist",
    "/magazin/doesnotexist",
    "/changelog/0.0.0",
    "/impressum/extra",
  ]) {
    test(`${path} answers 404 without caching`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
      expect(response.headers()["cache-control"]).toBe("no-store");
    });
  }

  test("a word page is cacheable by the proxy", async ({ request }) => {
    const response = await request.get("/wort/aasen");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("s-maxage=300");
  });

  test("the sitemap lists seeded words with a lastmod and the static routes", async ({
    request,
  }) => {
    const index = await request.get("/sitemap-index.xml");
    expect(await index.text()).toContain("/sitemap-0.xml");
    const xml = await (await request.get("/sitemap-0.xml")).text();
    expect(xml).toMatch(/<loc>[^<]*\/wort\/aasen<\/loc><lastmod>\d{4}-\d\d-\d\dT[^<]*Z<\/lastmod>/);
    expect(xml).toContain("/themen/essen-trinken");
    expect(xml).toContain("/magazin/berlinerisch-fuer-anfaenger");
    expect(xml).not.toMatch(/\/settings|\/anki\/danke/);
  });

  test("an OG image is rendered for a seeded word, not for an unknown one", async ({ request }) => {
    const ok = await request.get("/og/aasen.png");
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toBe("image/png");
    expect((await request.get("/og/doesnotexist.png")).status()).toBe(404);
  });

  test("the word of the day answers headword, slug and expiry", async ({ request }) => {
    const body = await (await request.get("/api/word-of-the-day")).json();
    expect(body).toEqual({
      berlinerisch: expect.any(String),
      expires: expect.any(Number),
      slug: expect.any(String),
    });
  });

  test("the public API of the CMS is not part of this server", async ({ request }) => {
    expect((await request.get("/api/words")).status()).toBe(404);
  });
});
