import { describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

describe("globals round-trip", () => {
  it("navigation", async () => {
    const payload = await getTestPayload();
    const main = [{ title: "Wörterbuch", link: "/", rel: "noopener", description: "Alle Wörter" }];
    await payload.updateGlobal({
      slug: "navigation",
      data: { main, footer1: [{ title: "Impressum", link: "/impressum" }], footer2: [] },
    });
    const doc = await payload.findGlobal({ slug: "navigation" });
    expect(doc.main?.[0]).toMatchObject(main[0]);
    expect(doc.footer1?.[0]).toMatchObject({ title: "Impressum", link: "/impressum" });
  });

  it("home keeps facts and stores the start page fields", async () => {
    const payload = await getTestPayload();
    const word = await payload.create({
      collection: "words",
      data: {
        berlinerisch: "Test",
        slug: `home-test-${Date.now()}`,
        ipa: "tɛst",
        _status: "published",
      },
    });
    const rich = {
      root: {
        type: "root",
        version: 1,
        direction: null,
        format: "" as const,
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: null,
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text: "x",
                format: 0,
                mode: "normal",
                style: "",
                detail: 0,
              },
            ],
          },
        ],
      },
    };
    const facts = [{ headline: "Fakt", text: rich }];
    await payload.updateGlobal({
      slug: "home",
      data: {
        facts,
        intro: "Hallo",
        tryWords: [word.id],
        browseLinks: [{ label: "Wörter", href: "/woerter", icon: "words" }],
        soundRules: [{ standard: "ich", berlin: "ick", example: "ick bin", rule: "g/ch zu k" }],
        faq: [{ question: "Was?", answer: rich }],
        aboutText: "Über",
      },
    });
    const doc = await payload.findGlobal({ slug: "home", depth: 0 });
    expect(doc.facts?.[0]?.headline).toBe("Fakt");
    expect(doc).toMatchObject({ intro: "Hallo", aboutText: "Über", tryWords: [word.id] });
    expect(doc.browseLinks?.[0]).toMatchObject({ label: "Wörter", icon: "words" });
    expect(doc.soundRules?.[0]).toMatchObject({ berlin: "ick" });
    expect(doc.faq?.[0]?.question).toBe("Was?");
    await payload.delete({ collection: "words", id: word.id });
  });

  it("affiliate", async () => {
    const payload = await getTestPayload();
    const books = [
      {
        title: "Buch",
        description: "Beschreibung",
        href: "https://example.com/b",
        imageUrl: "https://example.com/b.jpg",
        imageAlt: "Cover",
        badge: "Tipp",
        badgeModifier: "orange",
      },
    ];
    const disclaimers = [
      { plattform: "Amazon", text: "Als Partner verdiene ich an qualifizierten Verkäufen." },
    ];
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
      socialMedia: [
        { label: "Mastodon", profile: "https://example.social/@berliner", relMe: true },
      ],
    };
    await payload.updateGlobal({ slug: "company", data });
    const doc = await payload.findGlobal({ slug: "company" });
    expect(doc.platforms?.[0]).toMatchObject(data.platforms[0]!);
    expect(doc.wallets?.[0]).toMatchObject(data.wallets[0]!);
    expect(doc.socialMedia?.[0]).toMatchObject(data.socialMedia[0]!);
  });
});
