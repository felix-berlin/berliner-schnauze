import { describe, expect, it } from "vitest";

import { seedHome } from "../src/seed/homeSeed";
import { getTestPayload } from "./helpers/payload";

const ALL = ["intro", "knowledge", "soundRules", "faq", "aboutText", "tryWords", "browseLinks"];

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
    expect(first.written.sort()).toEqual([...ALL].sort());
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
    expect(second.skipped.sort()).toEqual([...ALL].sort());

    await payload.updateGlobal({ slug: "home", data: { intro: "Handgeschrieben" } });
    await seedHome(payload, slugs);
    expect((await payload.findGlobal({ slug: "home" })).intro).toBe("Handgeschrieben");
  });

  it("skips try-words when none of the slugs exist", async () => {
    const payload = await getTestPayload();
    await payload.updateGlobal({ slug: "home", data: { tryWords: [] } });
    const { written, skipped } = await seedHome(payload, [`seed-home-none-${Date.now()}`]);
    expect(written).not.toContain("tryWords");
    expect(skipped).toContain("tryWords");
  });
});
