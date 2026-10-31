import { describe, expect, it } from "vitest";

import { escapeHtml, lexicalToHtml } from "../src/lib/lexicalHtml";

const text = (value: string, format = 0) => ({ type: "text", text: value, format, detail: 0, mode: "normal", style: "", version: 1 });
const para = (...children: unknown[]) => ({ type: "paragraph", children, direction: "ltr", format: "", indent: 0, version: 1, textFormat: 0 });
const state = (...children: unknown[]) => ({ root: { type: "root", children, direction: "ltr", format: "", indent: 0, version: 1 } });
const link = (url: string, label: string) => ({ type: "link", fields: { url, linkType: "custom", newTab: false }, children: [text(label)], direction: "ltr", format: "", indent: 0, version: 3 });
const BASE = "https://cms.example";

describe("lexicalToHtml", () => {
  it("renders paragraphs and bold text without a container div", () => {
    expect(lexicalToHtml(state(para(text("a "), text("b", 1))), { mediaBase: BASE })).toBe("<p>a <strong>b</strong></p>");
  });

  it("gives a heading an id slugified from its text", () => {
    const h = (value: string) => ({ type: "heading", tag: "h2", children: [text(value)], direction: "ltr", format: "", indent: 0, version: 1 });
    expect(lexicalToHtml(state(h("Kommentare")), { mediaBase: BASE })).toBe('<h2 id="kommentare">Kommentare</h2>');
    expect(lexicalToHtml(state(h(" Größe & Äpfel! ")), { mediaBase: BASE })).toContain('id="groesse-aepfel"');
  });

  it("renders a link", () => {
    expect(lexicalToHtml(state(para(link("https://example.org/l", "Lizenz"))), { mediaBase: BASE })).toContain('<a href="https://example.org/l"');
  });

  it("marks a sponsored link rel=sponsored, also next to the new-tab rel", () => {
    const sponsored = (newTab: boolean) => ({ ...link("https://amzn.to/1", "Buch"), fields: { url: "https://amzn.to/1", linkType: "custom", newTab, sponsored: true } });
    expect(lexicalToHtml(state(para(sponsored(false))), { mediaBase: BASE })).toBe('<p><a rel="sponsored" href="https://amzn.to/1">Buch</a></p>');
    expect(lexicalToHtml(state(para(sponsored(true))), { mediaBase: BASE })).toContain('rel="sponsored noopener noreferrer" target="_blank"');
    expect(lexicalToHtml(state(para(link("https://example.org/l", "Lizenz"))), { mediaBase: BASE })).not.toContain("sponsored");
  });

  it("links an internal link to the populated doc's page", () => {
    const internal = (doc: unknown) => ({ ...link("", "Kiez"), fields: { linkType: "internal", newTab: false, doc } });
    expect(lexicalToHtml(state(para(internal({ relationTo: "words", value: { id: 1, slug: "kiez" } }))), { mediaBase: BASE })).toContain('<a href="/wort/kiez"');
    expect(lexicalToHtml(state(para(internal({ relationTo: "posts", value: { id: 2, slug: "kiezdeutsch" } }))), { mediaBase: BASE })).toContain('href="/magazin/kiezdeutsch"');
    expect(lexicalToHtml(state(para(internal({ relationTo: "words", value: 1 }))), { mediaBase: BASE })).toContain('href="#"');
    // a draft target would leak its slug and 404
    expect(lexicalToHtml(state(para(internal({ relationTo: "words", value: { id: 4, slug: "geheim", _status: "draft" } }))), { mediaBase: BASE })).toContain('href="#"');
    expect(lexicalToHtml(state(para(internal({ relationTo: "words", value: { id: 5, slug: "kiez", _status: "published" } }))), { mediaBase: BASE })).toContain('href="/wort/kiez"');
  });

  it("escapes angle brackets and ampersands in text", () => {
    expect(lexicalToHtml(state(para(text("Milla&Partner <https://x.org>"))), { mediaBase: BASE })).toBe("<p>Milla&amp;Partner &lt;https://x.org&gt;</p>");
  });

  it("renders a populated upload as an <img> with an absolute src", () => {
    const upload = { type: "upload", relationTo: "media", value: { id: 3, url: "/api/media/file/a.png", alt: "Eine Küche", mimeType: "image/png" }, fields: null, version: 3, format: "" };
    const html = lexicalToHtml(state(upload), { mediaBase: BASE });
    expect(html).toContain('src="https://cms.example/api/media/file/a.png"');
    expect(html).toContain('alt="Eine Küche"');
  });

  it("skips an upload that was not populated", () => {
    const upload = { type: "upload", relationTo: "media", value: 3, fields: null, version: 3, format: "" };
    expect(lexicalToHtml(state(upload), { mediaBase: BASE })).toBe("");
  });

  it.each([[null], [undefined]])("returns an empty string for %s", (value) => {
    expect(lexicalToHtml(value, { mediaBase: BASE })).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes the five html characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  });
});
