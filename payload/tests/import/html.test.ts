import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ImportRefs } from "../../src/import/mappers";
import type { WpPost } from "../../src/import/wp";

import { htmlToLexical } from "../../src/import/html";
import { mapPost } from "../../src/import/mappers";
import { wpUploadPath } from "../../src/lib/wpUploadPath";
import { PNG_BYTES } from "../helpers/media";
import { getTestPayload } from "../helpers/payload";
import post from "./fixtures/post.json";

type Node = { type: string; text?: string; format?: number | string; children?: Node[]; value?: unknown };

let payload: Payload;
let mediaId: number;
const BILD = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/03/bild.png";

const refs = (): ImportRefs => ({
  mediaIdByUrl: new Map([[wpUploadPath(BILD), mediaId]]),
  wordTypeIdByName: new Map(),
  themaIdBySlug: new Map(),
  wordIdByWpId: new Map(),
});

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({ collection: "posts", where: { slug: { equals: post.slug } } });
  await payload.delete({ collection: "media", where: { wpPath: { equals: "html-test/bild.png" } } });
  const media = await payload.create({
    collection: "media",
    data: { wpPath: "html-test/bild.png" },
    file: { data: PNG_BYTES, mimetype: "image/png", name: "html-test-bild.png", size: PNG_BYTES.length },
  });
  mediaId = media.id;
});

afterAll(async () => {
  await payload.delete({ collection: "posts", where: { slug: { equals: post.slug } } });
  await payload.delete({ collection: "media", where: { wpPath: { equals: "html-test/bild.png" } } });
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
    const data = await mapPost(post as WpPost, refs(), payload.config);
    const created = await payload.create({ collection: "posts", data });
    const read = await payload.findByID({ collection: "posts", id: created.id, depth: 0 });
    expect(read.content).toEqual(data.content);
  });
});
