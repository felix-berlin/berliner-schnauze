// @vitest-environment node
import { linkIntro } from "@utils/homeIntro.ts";
import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../../helpers";

const text = "Über {count} Wörter. Von Atze bis Zicke, mit Atze und Zickenkrieg.";

describe("linkIntro", () => {
  it("replaces {count} with the German formatted number", () => {
    expect(linkIntro("Über {count} Wörter", 1734, {})).toBe("Über 1.734 Wörter");
  });

  it("links the first whole-word Atze and Zicke when they are linkable", () => {
    expect(linkIntro(text, 1700, { Atze: "atze", Zicke: "zicke" })).toBe(
      'Über 1.700 Wörter. Von <a href="/wort/atze">Atze</a> bis <a href="/wort/zicke">Zicke</a>, mit Atze und Zickenkrieg.',
    );
  });

  it("links only the words in the linkable map", () => {
    expect(linkIntro(text, 1700, { Zicke: "zicke" })).toBe(
      'Über 1.700 Wörter. Von Atze bis <a href="/wort/zicke">Zicke</a>, mit Atze und Zickenkrieg.',
    );
  });

  it("does not link a word that only appears inside another word", () => {
    expect(linkIntro("Zickenkrieg", 1, { Zicke: "zicke" })).toBe("Zickenkrieg");
  });

  it("escapes HTML in the text and the slug", () => {
    expect(linkIntro('<b>"Atze"</b> & Co', 1, { Atze: 'a"b' })).toBe(
      '&lt;b&gt;&quot;<a href="/wort/a&quot;b">Atze</a>&quot;&lt;/b&gt; &amp; Co',
    );
  });

  it("leaves the text intact when nothing links", () => {
    expect(linkIntro("Von Atze bis Zicke.", 1, {})).toBe("Von Atze bis Zicke.");
  });
});

describe("HomeIntro.astro and BrowseChips.astro", () => {
  let intro: (props: Record<string, unknown>) => Promise<string>;
  let chips: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    intro = await createAstroRender((await import("@components/home/HomeIntro.astro")).default);
    chips = await createAstroRender((await import("@components/home/BrowseChips.astro")).default);
  }, 30_000);

  it("renders the one h1 and the linked intro sentence", async () => {
    const html = await intro({
      intro: "Über {count} Wörter, von Atze",
      linkable: { Atze: "atze" },
      wordCount: 1700,
    });
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Über 1.700 Wörter, von <a href="/wort/atze">Atze</a>');
  });

  it("renders the try and browse chips and drops an empty row", async () => {
    const html = await chips({
      browseLinks: [{ href: "/suche", icon: "random", label: "Zufallswort" }],
      tryWords: [{ lemma: "Stulle", slug: "stulle" }],
    });
    expect(html).toContain("Probier mal:");
    expect(html).toContain('<a href="/wort/stulle">Stulle</a>');
    expect(html).toContain("Oder stöber mal:");
    expect(html).toMatch(/<a href="\/suche">.*Zufallswort\s*<\/a>/s);
    const onlyLinks = await chips({
      browseLinks: [{ href: "/suche", icon: "random", label: "Zufallswort" }],
      tryWords: [],
    });
    expect(onlyLinks).not.toContain("Probier mal:");
    expect(await chips({ browseLinks: [], tryWords: [] })).not.toContain("c-home-browse");
  });
});
