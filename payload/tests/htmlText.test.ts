import { describe, expect, it } from "vitest";

import { decodeEntities, htmlToText, stripTags } from "../src/lib/htmlText";

describe("htmlText", () => {
  it("drops tags, nested openers reassemble and go too", () => {
    expect(stripTags("a<scr<b>ipt>b")).toBe("ab");
    expect(stripTags("<p>x</p><br/>y", " ")).toBe(" x  y");
  });

  it("decodes entities in one pass", () => {
    expect(decodeEntities("&lt;b&gt; &amp;lt; &quot;&#39;")).toBe(`<b> &lt; "'`);
  });

  it("combines both", () => {
    expect(htmlToText("<p>Atze &amp; Zicke</p>")).toBe("Atze & Zicke");
  });
});
