import { describe, expect, it } from "vitest";

import { htmlToLexical } from "../src/lib/htmlToLexical";
import { seedHome } from "../src/seed/homeSeed";
import { getTestPayload } from "./helpers/payload";

const ALL = ["intro", "knowledge", "soundRules", "faq", "aboutText", "tryWords", "browseLinks"];

// Keys outside the global's own fields (topic sayings, teaser, placeholder IPA) depend on what else the shared test DB holds.
const fieldKeys = (keys: string[]) => keys.filter((k) => ALL.includes(k));

describe("seedHome", () => {
  it("writes empty fields once, never overwrites edited ones", async () => {
    const payload = await getTestPayload();
    const stamp = Date.now();
    const slugs = [`seed-home-a-${stamp}`, `seed-home-b-${stamp}`];
    for (const slug of slugs)
      await payload.create({
        collection: "words",
        data: { berlinerisch: slug, slug, ipa: "tɛst", _status: "published" },
      });
    await payload.updateGlobal({
      slug: "home",
      data: {
        browseLinks: [],
        intro: null,
        knowledge: null,
        soundRules: [],
        faq: [],
        aboutText: null,
        tryWords: [],
      },
    });

    const first = await seedHome(payload, [...slugs, `seed-home-missing-${stamp}`]);
    expect(fieldKeys(first.written).sort()).toEqual([...ALL].sort());
    const home = await payload.findGlobal({ slug: "home", depth: 0 });
    expect(home.soundRules).toHaveLength(6);
    expect(home.faq).toHaveLength(6);
    expect(home.tryWords).toHaveLength(2);
    expect(home.intro).toContain("{count}");
    expect(home.intro).not.toContain("1.700");
    expect(home.knowledge).toBeTruthy();
    expect(home.browseLinks?.map((l) => l.icon)).toEqual([
      "audio",
      "idiom",
      "short",
      "rhyme",
      "random",
    ]);
    expect(JSON.stringify(home.knowledge)).toContain('"url":"/wort/ick"');
    expect(JSON.stringify(home.knowledge)).toContain('"url":"/wort/spaeti"');
    expect(JSON.stringify(home.knowledge)).not.toContain("Übersicht rechts");

    const second = await seedHome(payload, slugs);
    expect(second.written).toEqual([]);
    expect(fieldKeys(second.alreadySet).sort()).toEqual([...ALL].sort());
    expect(fieldKeys(second.unavailable)).toEqual([]);

    await payload.updateGlobal({ slug: "home", data: { intro: "Handgeschrieben" } });
    await seedHome(payload, slugs);
    expect((await payload.findGlobal({ slug: "home" })).intro).toBe("Handgeschrieben");
  });

  it("skips try-words when none of the slugs exist", async () => {
    const payload = await getTestPayload();
    await payload.updateGlobal({ slug: "home", data: { tryWords: [] } });
    const { written, unavailable } = await seedHome(payload, [`seed-home-none-${Date.now()}`]);
    expect(written).not.toContain("tryWords");
    expect(unavailable).toContain("tryWords");
  });

  it("never overwrites an existing teaser quote or word IPA, and a second run writes nothing more", async () => {
    const payload = await getTestPayload();
    const stamp = Date.now();
    const post = await payload.create({
      collection: "posts",
      data: {
        title: "Seed Home",
        slug: `seed-home-post-${stamp}`,
        // Far in the future: the newest published post, the one the seed picks.
        publishedAt: "2099-01-01T00:00:00.000Z",
        teaserZitat: "Eigener Satz",
        teaserIpa: "eigen",
        content: await htmlToLexical(
          "<p>Ein ganz anderer erster Satz, der lang genug ist.</p>",
          payload.config,
        ),
        _status: "published",
      },
    });
    const word = await payload.create({
      collection: "words",
      data: {
        berlinerisch: `seed-ipa-${stamp}`,
        slug: `seed-ipa-${stamp}`,
        ipa: "eigen",
        _status: "published",
      },
    });
    try {
      const first = await seedHome(payload, []);
      expect(first.written).not.toContain("teaserZitat");
      expect(first.alreadySet).toContain("teaserZitat");
      const kept = await payload.findByID({ collection: "posts", id: post.id, depth: 0 });
      expect([kept.teaserZitat, kept.teaserIpa]).toEqual(["Eigener Satz", "eigen"]);
      expect((await payload.findByID({ collection: "words", id: word.id, depth: 0 })).ipa).toBe(
        "eigen",
      );

      const second = await seedHome(payload, []);
      expect(
        second.written.filter((k) => /^(teaserZitat|teaserIpa|topicSayings|wordIpa)/.test(k)),
      ).toEqual([]);
    } finally {
      await payload.delete({ collection: "posts", id: post.id });
      await payload.delete({ collection: "words", id: word.id });
    }
  });
});
