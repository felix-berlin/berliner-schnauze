import type { Payload } from "payload";

import { beforeAll, describe, expect, it } from "vitest";

import { htmlToLexical } from "../src/lib/htmlToLexical";
import { lexicalNodes } from "./helpers/lexical";
import { getTestPayload } from "./helpers/payload";

type Node = { type: string; text?: string; format?: number | string; children?: Node[] };

let payload: Payload;

beforeAll(async () => {
  payload = await getTestPayload();
});

describe("htmlToLexical", () => {
  it("converts paragraphs with bold text and blockquotes", async () => {
    const state = await htmlToLexical("<p>a <strong>b</strong></p><blockquote><p>q</p></blockquote>", payload.config);
    const [p, quote] = state.root.children as Node[];
    expect(p.type).toBe("paragraph");
    expect(p.children?.map((c) => [c.text, c.format])).toEqual([
      ["a ", 0],
      ["b", 1],
    ]);
    expect(quote.type).toBe("quote");
  });

  it("keeps rel=sponsored as the link's sponsored field (Lexical's import drops rel)", async () => {
    const state = await htmlToLexical('<p><a href="https://amzn.to/1" rel="sponsored noopener" target="_blank">Buch</a> <a href="https://example.org/">frei</a></p>', payload.config);
    expect(lexicalNodes(state, "link").map((l) => (l as { fields: { sponsored?: boolean } }).fields.sponsored)).toEqual([true, undefined]);
  });

  it("turns an <img> into a link instead of a pending upload", async () => {
    const state = await htmlToLexical('<p>Siehe <img src="https://example.com/x.png" alt="X" /></p>', payload.config);
    expect(lexicalNodes(state, "upload")).toEqual([]);
    expect(lexicalNodes(state, "link")).toEqual([expect.objectContaining({ fields: expect.objectContaining({ url: "https://example.com/x.png" }) })]);
  });

  it("keeps a link and a literal <https://...> URL as text", async () => {
    const state = await htmlToLexical('<p>A <a href="https://example.org/l">Lizenz</a> <https://example.org/x> B</p>', payload.config);
    expect(lexicalNodes(state, "link")).toEqual([expect.objectContaining({ fields: expect.objectContaining({ url: "https://example.org/l" }) })]);
    const text = lexicalNodes(state, "text").map((n) => n.text).join("");
    expect(text).toBe("A Lizenz <https://example.org/x> B");
  });
});
