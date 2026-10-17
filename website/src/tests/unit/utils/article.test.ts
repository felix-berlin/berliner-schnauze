import type { Media } from "payload-app";

import { processArticleBlocks, slugify } from "@utils/article";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example:3001" }));

const legacyOrigin = "https://cms.berliner-schnauze.wtf";
const cmsOrigin = "https://cms.example:3001";

const image = {
  alt: '<a href="https://amzn.to/3xyz123" rel="sponsored">Bild</a>',
  createdAt: "",
  id: 1,
  updatedAt: "",
  url: "https://cms.example/bild.png",
} satisfies Media;

describe("slugify", () => {
  it("transliterates German umlauts and drops punctuation", () => {
    expect(slugify("Französisch: das Erbe der Hugenotten")).toBe(
      "franzoesisch-das-erbe-der-hugenotten",
    );
    expect(slugify("Straße & Größe")).toBe("strasse-groesse");
  });
});

describe("processArticleBlocks", () => {
  it("injects heading ids and builds a TOC excluding Quellen", () => {
    const { blocks, toc } = processArticleBlocks([
      '<h2 class="wp-block-heading">Erstens</h2>',
      "<h2>Zweitens</h2>",
      "<h2>Quellen</h2>",
    ]);

    expect(blocks[0]).toContain('id="erstens"');
    expect(toc).toEqual([
      { id: "erstens", text: "Erstens" },
      { id: "zweitens", text: "Zweitens" },
    ]);
  });

  it("de-duplicates repeated heading slugs", () => {
    const { toc } = processArticleBlocks(["<h2>Fazit</h2>", "<h2>Fazit</h2>"]);
    expect(toc.map((t) => t.id)).toEqual(["fazit", "fazit-2"]);
  });

  it("adds a return anchor only to the first reference of each source", () => {
    const { blocks } = processArticleBlocks([
      'Erst <a href="#quelle-1">[1]</a> und nochmal <a href="#quelle-1">[1]</a>.',
    ]);
    const html = blocks[0] as string;
    expect(html.match(/id="fnref-1"/g)).toHaveLength(1);
    // the id lands on the first <a>, not the later duplicate reference
    expect(html.slice(html.indexOf("<a"))).toMatch(/^<a id="fnref-1"/);
  });

  it("appends a back-link to cited Quellen entries but not to uncited ones", () => {
    const { blocks } = processArticleBlocks([
      '<p><a href="#quelle-1">[1]</a></p>',
      image,
      '<ol><li id="quelle-1">Cited</li><li id="quelle-2">Uncited</li></ol>',
    ]);
    const sources = blocks[2] as string;
    expect(sources).toContain('href="#fnref-1"');
    expect(sources).not.toContain('href="#fnref-2"');
  });

  it("never carries angle brackets from crafted heading markup into TOC/slug", () => {
    const { blocks, toc } = processArticleBlocks([
      "<h2>Hallo <scr<script>ipt>alert(1)</script></h2>",
    ]);
    expect(toc[0].text).not.toMatch(/[<>]/);
    expect(toc[0].id).toMatch(/^[a-z0-9-]+$/);
    expect(blocks[0]).toContain(`id="${toc[0].id}"`);
  });

  it("reuses an existing heading id for the TOC without rewriting the markup", () => {
    const { blocks, toc } = processArticleBlocks(['<h2 id="custom-anchor">Bereits gesetzt</h2>']);
    expect(toc).toEqual([{ id: "custom-anchor", text: "Bereits gesetzt" }]);
    expect(blocks[0]).toBe('<h2 id="custom-anchor">Bereits gesetzt</h2>');
  });

  it("keeps a pre-identified Quellen heading out of the TOC", () => {
    const { toc } = processArticleBlocks(['<h2 id="q">Quellen</h2>']);
    expect(toc).toHaveLength(0);
  });

  it("falls back to a generic slug when a heading has no slug-able text", () => {
    const { blocks, toc } = processArticleBlocks(["<h2>—</h2>"]);
    expect(toc[0].id).toBe("abschnitt");
    expect(blocks[0]).toContain('id="abschnitt"');
  });

  it.each([[legacyOrigin], [cmsOrigin]])(
    "rewrites CMS-absolute internal links (%s) to relative paths",
    (origin) => {
      const { blocks } = processArticleBlocks([
        `<p>Siehe <a href="${origin}/wort/bulette/">Bulette</a>.</p>`,
      ]);
      expect(blocks[0]).toContain('href="/wort/bulette/"');
    },
  );

  it("leaves external links untouched", () => {
    const original = '<p><a href="https://example.com/foo">Extern</a></p>';
    const { blocks } = processArticleBlocks([original]);
    expect(blocks[0]).toBe(original);
  });

  it("returns image blocks untouched", () => {
    const { blocks, toc } = processArticleBlocks([image]);
    expect(blocks[0]).toBe(image);
    expect(toc).toHaveLength(0);
  });

  it("does not change the cached blocks it is given, so a second render adds nothing twice", () => {
    const cached = [
      '<p><a href="https://amzn.to/1" rel="sponsored">x</a> <a href="#quelle-1">[1]</a></p>',
      '<ol><li id="quelle-1">Cited</li></ol>',
    ];
    const snapshot = [...cached];
    const first = processArticleBlocks(cached);
    const second = processArticleBlocks(cached);
    expect(cached).toEqual(snapshot);
    expect(second.blocks).toEqual(first.blocks);
  });

  describe("hasAffiliateLinks", () => {
    it("detects a link marked rel=sponsored", () => {
      const { hasAffiliateLinks } = processArticleBlocks([
        '<p>Kauf <a href="https://www.amazon.de/dp/B01N5IB20Q" rel="sponsored">hier</a>.</p>',
      ]);
      expect(hasAffiliateLinks).toBe(true);
    });

    it("detects rel=sponsored combined with other rel values", () => {
      const { hasAffiliateLinks } = processArticleBlocks([
        '<p><a href="https://amzn.to/3xyz123" rel="noopener sponsored nofollow">Angebot</a></p>',
      ]);
      expect(hasAffiliateLinks).toBe(true);
    });

    it("ignores a link without rel=sponsored, even to amazon.de", () => {
      const { hasAffiliateLinks } = processArticleBlocks([
        '<p><a href="https://www.amazon.de/dp/B01N5IB20Q">hier</a></p>',
      ]);
      expect(hasAffiliateLinks).toBe(false);
    });

    it("is false when no link is present", () => {
      const { hasAffiliateLinks } = processArticleBlocks(["<p>Ganz normaler Text ohne Links.</p>"]);
      expect(hasAffiliateLinks).toBe(false);
    });

    it("does not read image fields as html", () => {
      expect(processArticleBlocks([image]).hasAffiliateLinks).toBe(false);
    });
  });

  describe("sponsored link labeling", () => {
    it("appends a visible Anzeige tag right after a rel=sponsored link", () => {
      const { blocks } = processArticleBlocks([
        '<p><a href="https://amzn.to/3xyz123" rel="sponsored">Angebot</a> lohnt sich.</p>',
      ]);
      expect(blocks[0]).toBe(
        '<p><a href="https://amzn.to/3xyz123" rel="sponsored">Angebot</a>' +
          '<span class="c-magazin-article__sponsored-tag">Anzeige</span> lohnt sich.</p>',
      );
    });

    it("labels every sponsored link when there are several", () => {
      const { blocks } = processArticleBlocks([
        '<p><a href="https://amzn.to/1" rel="sponsored">Eins</a> und ' +
          '<a href="https://amzn.to/2" rel="sponsored">Zwei</a></p>',
      ]);
      const html = blocks[0] as string;
      expect(html.match(/c-magazin-article__sponsored-tag/g)).toHaveLength(2);
    });

    it("does not label a link without rel=sponsored", () => {
      const { blocks } = processArticleBlocks([
        '<p><a href="https://www.amazon.de/dp/B01N5IB20Q">hier</a></p>',
      ]);
      expect(blocks[0]).not.toContain("sponsored-tag");
    });
  });
});
