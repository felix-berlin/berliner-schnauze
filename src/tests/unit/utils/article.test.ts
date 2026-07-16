import { processArticleBlocks, slugify } from "@utils/article";
import { describe, expect, it } from "vitest";

const block = (order: number, saveContent: string, name = "core/paragraph") => ({
  name,
  order,
  saveContent,
});

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
      block(1, '<h2 class="wp-block-heading">Erstens</h2>'),
      block(3, "<h2>Quellen</h2>"),
      block(2, "<h2>Zweitens</h2>"),
    ]);

    expect(blocks[0].saveContent).toContain('id="erstens"');
    expect(toc).toEqual([
      { id: "erstens", text: "Erstens" },
      { id: "zweitens", text: "Zweitens" },
    ]);
  });

  it("de-duplicates repeated heading slugs", () => {
    const { toc } = processArticleBlocks([
      block(1, "<h2>Fazit</h2>"),
      block(2, "<h2>Fazit</h2>"),
    ]);
    expect(toc.map((t) => t.id)).toEqual(["fazit", "fazit-2"]);
  });

  it("adds a return anchor only to the first reference of each source", () => {
    const { blocks } = processArticleBlocks([
      block(1, 'Erst <a href="#quelle-1">[1]</a> und nochmal <a href="#quelle-1">[1]</a>.'),
    ]);
    const html = blocks[0].saveContent ?? "";
    expect(html.match(/id="fnref-1"/g)).toHaveLength(1);
    // the id lands on the first <a>, not the later duplicate reference
    expect(html.slice(html.indexOf("<a"))).toMatch(/^<a id="fnref-1"/);
  });

  it("appends a back-link to cited Quellen entries but not to uncited ones", () => {
    const { blocks } = processArticleBlocks([
      block(1, '<p><a href="#quelle-1">[1]</a></p>'),
      block(2, '<ol><li id="quelle-1">Cited</li><li id="quelle-2">Uncited</li></ol>'),
    ]);
    const sources = blocks[1].saveContent ?? "";
    expect(sources).toContain('href="#fnref-1"');
    expect(sources).not.toContain('href="#fnref-2"');
  });

  it("never carries angle brackets from crafted heading markup into TOC/slug", () => {
    const { blocks, toc } = processArticleBlocks([
      block(1, "<h2>Hallo <scr<script>ipt>alert(1)</script></h2>"),
    ]);
    expect(toc[0].text).not.toMatch(/[<>]/);
    expect(toc[0].id).toMatch(/^[a-z0-9-]+$/);
    expect(blocks[0].saveContent).toContain(`id="${toc[0].id}"`);
  });

  it("reuses an existing heading id for the TOC without rewriting the markup", () => {
    const { blocks, toc } = processArticleBlocks([
      block(1, '<h2 id="custom-anchor">Bereits gesetzt</h2>'),
    ]);
    expect(toc).toEqual([{ id: "custom-anchor", text: "Bereits gesetzt" }]);
    expect(blocks[0].saveContent).toBe('<h2 id="custom-anchor">Bereits gesetzt</h2>');
  });

  it("keeps a pre-identified Quellen heading out of the TOC", () => {
    const { toc } = processArticleBlocks([block(1, '<h2 id="q">Quellen</h2>')]);
    expect(toc).toHaveLength(0);
  });

  it("falls back to a generic slug when a heading has no slug-able text", () => {
    const { blocks, toc } = processArticleBlocks([block(1, "<h2>—</h2>")]);
    expect(toc[0].id).toBe("abschnitt");
    expect(blocks[0].saveContent).toContain('id="abschnitt"');
  });

  it("returns blocks with empty or missing saveContent untouched", () => {
    const empty = { name: "core/paragraph", order: 1, saveContent: "" };
    const nil = { name: "core/paragraph", order: 2, saveContent: null };
    const { blocks, toc } = processArticleBlocks([empty, nil]);
    expect(blocks[0]).toBe(empty);
    expect(blocks[1]).toBe(nil);
    expect(toc).toHaveLength(0);
  });

  it("leaves image and quote blocks untouched", () => {
    const original = "<h2>ignored</h2>";
    const { blocks, toc } = processArticleBlocks([block(1, original, "core/image")]);
    expect(blocks[0].saveContent).toBe(original);
    expect(toc).toHaveLength(0);
  });
});
