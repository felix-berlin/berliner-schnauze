import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ImportRefs } from "../../src/import/mappers";
import type { WpPost, WpWord } from "../../src/import/wp";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../../src/fields/contentModified";
import { htmlToLexical, htmlToText } from "../../src/import/html";
import { mapPost, mapWord } from "../../src/import/mappers";
import { wpUploadPath } from "../../src/lib/wpUploadPath";
import { expectNoPendingUploads, lexicalNodes } from "../helpers/lexical";
import { PNG_BYTES } from "../helpers/media";
import { getTestPayload } from "../helpers/payload";
import post from "./fixtures/post.json";
import testwort from "./fixtures/word-testwort.json";

type Node = { type: string; text?: string; format?: number | string; children?: Node[]; value?: unknown };

let payload: Payload;
let mediaId: number;
const BILD = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/03/bild.png";
const HTML_TEST_IMG = "https://cms.berliner-schnauze.wtf/wp-content/uploads/html-test/bild.png?ver=3";
const WORD_IDS = [990102, 990103];

const refs = (): ImportRefs => ({
  mediaIdByUrl: new Map([
    [wpUploadPath(BILD), mediaId],
    [wpUploadPath(HTML_TEST_IMG), mediaId],
  ]),
  wordTypeIdByName: new Map(),
  themaIdBySlug: new Map(),
  wordIdByWpId: new Map(),
});
const emptyRefs = (): ImportRefs => ({ mediaIdByUrl: new Map(), wordTypeIdByName: new Map(), themaIdBySlug: new Map(), wordIdByWpId: new Map() });

const cleanup = async () => {
  await payload.delete({ collection: "posts", where: { slug: { equals: post.slug } } });
  await payload.delete({ collection: "words", where: { wpId: { in: WORD_IDS } } });
  await payload.delete({ collection: "media", where: { wpPath: { equals: "html-test/bild.png" } } });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  const media = await payload.create({
    collection: "media",
    data: { wpPath: "html-test/bild.png" },
    file: { data: PNG_BYTES, mimetype: "image/png", name: "html-test-bild.png", size: PNG_BYTES.length },
  });
  mediaId = media.id;
});

afterAll(cleanup);

/** Map an invented word with `infoText`, save it via the Local API and read it back. */
async function saveWordWithInfoText(wpId: number, infoText: string, wordRefs: ImportRefs) {
  const unmapped: string[] = [];
  const node = { ...structuredClone(testwort), databaseId: wpId, slug: `import-html-${wpId}`, wordProperties: { ...testwort.wordProperties, infoText, relatedWords: null } };
  const data = await mapWord(node as WpWord, wordRefs, payload.config, (src) => unmapped.push(src));
  const context = { [PRESERVE_CONTENT_MODIFIED_AT]: true };
  const created = await payload.create({ collection: "words", data, context, depth: 0 });
  const read = await payload.findByID({ collection: "words", id: created.id, depth: 0 });
  return { read, unmapped };
}

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

  it("stores a mapped <img> in infoText as an upload node", async () => {
    const { read, unmapped } = await saveWordWithInfoText(990102, `<p>Text</p><p><img src="${HTML_TEST_IMG}" alt="Bild" /></p>`, refs());
    expectNoPendingUploads(read.infoText);
    expect(lexicalNodes(read.infoText, "upload")).toEqual([expect.objectContaining({ relationTo: "media", value: mediaId })]);
    expect(unmapped).toEqual([]);
  });

  it("turns an unmapped <img> into a link and reports it", async () => {
    const { read, unmapped } = await saveWordWithInfoText(990103, `<p>Siehe <img src="https://example.com/x.png" alt="X" /></p>`, refs());
    expectNoPendingUploads(read.infoText);
    expect(lexicalNodes(read.infoText, "upload")).toEqual([]);
    expect(lexicalNodes(read.infoText, "link")).toEqual([expect.objectContaining({ fields: expect.objectContaining({ url: "https://example.com/x.png" }) })]);
    expect(unmapped).toEqual(["https://example.com/x.png"]);
  });
});

describe("mapPost", () => {
  it("puts an upload node at the image block's position", async () => {
    const doc = await mapPost(post as WpPost, refs(), payload.config);
    const types = (doc.content?.root.children as Node[]).map((n) => n.type);
    expect(types).toEqual(["paragraph", "upload", "quote", "paragraph"]);
    expect(doc.content?.root.children[1]).toEqual({ type: "upload", relationTo: "media", value: mediaId, version: 3, format: "", fields: null });
    expect(doc).toMatchObject({
      wpId: 990201,
      slug: "import-testbeitrag",
      title: "Import-Testbeitrag",
      _status: "published",
      excerpt: "Kurz & knapp: ein erfundener Beitrag.",
      publishedAt: "2024-03-04T05:06:07.000Z",
    });
  });

  it("round-trips upload and quote nodes through posts.content", async () => {
    const unmapped: string[] = [];
    const data = await mapPost(post as WpPost, refs(), payload.config, (src) => unmapped.push(src));
    expect(unmapped).toEqual(["https://example.com/extern.png"]);
    const created = await payload.create({ collection: "posts", data });
    const read = await payload.findByID({ collection: "posts", id: created.id, depth: 0 });
    expect(read.content).toEqual(data.content);
    expectNoPendingUploads(read.content);
    expect(lexicalNodes(read.content, "quote")).toHaveLength(1);
    await payload.delete({ collection: "posts", id: created.id });
  });

  it("saves a post whose image download failed (fallback HTML becomes a link)", async () => {
    const unmapped: string[] = [];
    const data = await mapPost(post as WpPost, emptyRefs(), payload.config, (src) => unmapped.push(src));
    expect(unmapped.sort()).toEqual([BILD, "https://example.com/extern.png"].sort());
    const created = await payload.create({ collection: "posts", data });
    const read = await payload.findByID({ collection: "posts", id: created.id, depth: 0 });
    expectNoPendingUploads(read.content);
    expect(lexicalNodes(read.content, "upload")).toEqual([]);
    await payload.delete({ collection: "posts", id: created.id });
  });
});

describe("htmlToText", () => {
  it("decodes entities and keeps a literal <https://...> URL", () => {
    expect(htmlToText("<p>Milla&#038;Partner <https://example.org/x>, via Commons</p>")).toBe("Milla&Partner <https://example.org/x>, via Commons");
  });

  it("separates paragraphs and line breaks with a newline", () => {
    expect(htmlToText("<p>a</p>\n<p>b<br>c</p>")).toBe("a\nb\nc");
  });
});

describe("htmlToLexical links", () => {
  it("keeps a link and a literal <https://...> URL as text", async () => {
    const state = await htmlToLexical('<p>A <a href="https://example.org/l">Lizenz</a> <https://example.org/x> B</p>', payload.config);
    expect(lexicalNodes(state, "link")).toEqual([expect.objectContaining({ fields: expect.objectContaining({ url: "https://example.org/l" }) })]);
    const text = lexicalNodes(state, "text").map((n) => n.text).join("");
    expect(text).toBe("A Lizenz <https://example.org/x> B");
  });
});
