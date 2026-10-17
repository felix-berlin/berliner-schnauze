import { describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

describe("globals round-trip", () => {
  it("navigation", async () => {
    const payload = await getTestPayload();
    const main = [{ title: "Wörterbuch", link: "/", rel: "noopener", description: "Alle Wörter" }];
    await payload.updateGlobal({ slug: "navigation", data: { main, footer1: [{ title: "Impressum", link: "/impressum" }], footer2: [] } });
    const doc = await payload.findGlobal({ slug: "navigation" });
    expect(doc.main?.[0]).toMatchObject(main[0]);
    expect(doc.footer1?.[0]).toMatchObject({ title: "Impressum", link: "/impressum" });
  });

  it("affiliate", async () => {
    const payload = await getTestPayload();
    const books = [
      { title: "Buch", description: "Beschreibung", href: "https://example.com/b", imageUrl: "https://example.com/b.jpg", imageAlt: "Cover", badge: "Tipp", badgeModifier: "orange" },
    ];
    const disclaimers = [{ plattform: "Amazon", text: "Als Partner verdiene ich an qualifizierten Verkäufen." }];
    await payload.updateGlobal({ slug: "affiliate", data: { books, disclaimers } });
    const doc = await payload.findGlobal({ slug: "affiliate" });
    expect(doc.books?.[0]).toMatchObject(books[0]);
    expect(doc.disclaimers?.[0]).toMatchObject(disclaimers[0]);
  });

  it("company", async () => {
    const payload = await getTestPayload();
    const data = {
      platforms: [{ name: "Ko-fi", link: "https://ko-fi.com/beispiel" }],
      wallets: [{ address: "0xEXAMPLE", chains: ["Ethereum", "Base"] }],
      socialMedia: [{ label: "Mastodon", profile: "https://example.social/@berliner", relMe: true }],
    };
    await payload.updateGlobal({ slug: "company", data });
    const doc = await payload.findGlobal({ slug: "company" });
    expect(doc.platforms?.[0]).toMatchObject(data.platforms[0]!);
    expect(doc.wallets?.[0]).toMatchObject(data.wallets[0]!);
    expect(doc.socialMedia?.[0]).toMatchObject(data.socialMedia[0]!);
  });
});
