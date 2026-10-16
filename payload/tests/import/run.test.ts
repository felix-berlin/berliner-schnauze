import type { Payload } from "payload";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as wp from "../../src/import/wp";
import { assertSafeImportTarget, exitCodeFor, runImport } from "../../src/import/run";
import { MP3_BYTES, PDF_BYTES, PNG_BYTES } from "../helpers/media";
import { expectNoPendingUploads, lexicalNodes } from "../helpers/lexical";
import { getTestPayload } from "../helpers/payload";
import aasen from "./fixtures/word-aasen.json";
import post from "./fixtures/post.json";
import testwort from "./fixtures/word-testwort.json";
import wa from "./fixtures/word-wa.json";

vi.mock("../../src/import/wp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/import/wp")>()),
  wpGraphql: vi.fn(),
}));

const PNG = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/K%C3%BCche.png";
const PDF = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/handout.pdf";
const INFO_BILD = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/info-bild.png";
const MEDIA_PATHS = ["2024/01/info-bild.png", "import_testwort.mp3", "2024/01/Küche.png", "2024/01/handout.pdf", "2024/03/titelbild.png", "2024/03/bild.png"];
const WORD_IDS = [aasen.databaseId, wa.databaseId, testwort.databaseId];
/** WP drafts with empty slug and empty (required) berlinerisch. */
const emptyDrafts = [990601, 990602].map((databaseId) => ({ databaseId, status: "draft", slug: "", wordProperties: { berlinerisch: "" } }));

/** Published word with no headword (real case: baletti-machen-2): not importable, skipped with a warning. */
const emptyPublished = { databaseId: 990603, status: "publish", slug: "baletti-machen-2", wordProperties: { berlinerisch: null, translations: null } };

const page = (nodes: unknown[], endCursor: string, hasNextPage: boolean) => ({
  berlinerWords: { nodes, pageInfo: { endCursor, hasNextPage } },
});

/** WordPress fake. `wordsPage2` lets a test break pagination, `wordsPage1` drop or add words. */
function mockWordPress(wordsPage2: () => unknown = () => page([testwort], "c2", false), wordsPage1: unknown[] = [aasen, wa]) {
  vi.mocked(wp.wpGraphql).mockImplementation(async (query: string, variables?: Record<string, unknown>) => {
    switch (query) {
      case wp.WORD_TYPES_QUERY:
        return { berlinerischWordTypes: { nodes: [{ databaseId: 990301, name: "Substantiv", slug: "substantiv" }], pageInfo: { hasNextPage: false } } };
      case wp.THEMEN_QUERY:
        return {
          berlinerischThemen: {
            nodes: ["geld", "koerper", "schimpfwoerter-beleidigungen", "beziehungen-soziales"].map((slug, i) => ({
              databaseId: 990401 + i,
              name: slug,
              slug,
              description: "",
              seo: null,
            })),
            pageInfo: { hasNextPage: false },
          },
        };
      case wp.WORDS_QUERY:
        return variables?.after ? wordsPage2() : page(wordsPage1, "c1", true);
      case wp.POSTS_QUERY:
        return { posts: { nodes: [post], pageInfo: { hasNextPage: false } } };
      case wp.PAGES_QUERY:
        return { pages: { nodes: [{ databaseId: 990501, slug: "import-testseite", title: "Testseite", content: "<p>Seite</p>", seo: null }] } };
      case wp.MENU_QUERY:
        return { menu: { menuItems: { nodes: [{ label: `Start ${String(variables?.name)}`, path: "/", linkRelationship: null, description: null }] } } };
      case wp.AFFILIATE_QUERY:
        return { affliate: { affliateLinksFields: { books: [{ title: "Buch", href: "https://example.com/b" }, null], disclaimers: [] } } };
      case wp.COMPANY_QUERY:
        return {
          company: {
            companyInformations: {
              funding: [{ name: "Beispiel", link: "https://example.com/pay", adresse: null }],
              socialMedia: [{ rel: "me", networkprofile: "https://example.social/@bs", networkname: ["mastodon", "Mastodon"] }],
            },
          },
        };
      default:
        throw new Error(`unexpected query ${query.slice(0, 40)}`);
    }
  });
}

const fetchMock = vi.spyOn(globalThis, "fetch");
function mockDownloads(status: (url: string) => number = () => 200) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (status(url) !== 200) return new Response("nope", { status: status(url) });
    const [body, type] = url.includes(".mp3") ? [MP3_BYTES, "audio/mpeg"] : url.includes(".pdf") ? [PDF_BYTES, "application/pdf"] : [PNG_BYTES, "image/png"];
    return new Response(new Uint8Array(body), { headers: { "content-type": type } });
  });
}

let payload: Payload;
const findWord = async (wpId: number) =>
  (await payload.find({ collection: "words", where: { wpId: { equals: wpId } }, depth: 0, limit: 1, draft: true })).docs[0];

beforeAll(async () => {
  payload = await getTestPayload();
  // Only the origin matters (media host check); wpGraphql itself is mocked.
  process.env.WP_API = "https://cms.berliner-schnauze.wtf/graphql";
});

beforeEach(async () => {
  fetchMock.mockReset();
  vi.mocked(wp.wpGraphql).mockReset();
  await payload.delete({ collection: "words", where: { wpId: { in: [...WORD_IDS, emptyPublished.databaseId, ...emptyDrafts.map((w) => w.databaseId)] } } });
  await payload.delete({ collection: "posts", where: { wpId: { equals: post.databaseId } } });
  await payload.delete({ collection: "pages", where: { wpId: { equals: 990501 } } });
  await payload.delete({ collection: "themen", where: { wpId: { greater_than_equal: 990401, less_than: 990500 } } });
  await payload.delete({ collection: "word-types", where: { wpId: { equals: 990301 } } });
  await payload.delete({ collection: "media", where: { wpPath: { in: MEDIA_PATHS } } });
});

describe("runImport", () => {
  it("is idempotent: a second run updates in place", async () => {
    mockWordPress();
    mockDownloads();
    const first = await runImport(payload);
    expect(first.created).toMatchObject({ media: 5, "word-types": 1, themen: 4, words: 3, posts: 1, pages: 1 });
    expect(first.failures).toEqual([expect.objectContaining({ kind: "media", ref: PDF })]);
    expect(first.missingRelated).toBe(1);
    expect(first.warnings).toEqual(
      expect.arrayContaining([
        { kind: "media-foreign-host", ref: "https://example.com/fremd.jpg", src: "https://example.com/fremd.jpg" },
        { kind: "html-image", ref: post.slug, src: "https://example.com/extern.png" },
      ]),
    );
    expect(first.warnings).toHaveLength(2);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain("https://example.com/fremd.jpg");
    const downloads = fetchMock.mock.calls.length;

    const second = await runImport(payload);
    expect(Object.values(second.created).every((n) => n === 0)).toBe(true);
    expect(second.updated).toMatchObject({ media: 5, "word-types": 1, themen: 4, words: 3, posts: 1, pages: 1 });
    expect(second.missingRelated).toBe(1);
    // Existing media are not downloaded again (only the rejected pdf is retried).
    expect(fetchMock.mock.calls.length - downloads).toBe(1);

    const count = (collection: "words" | "media") =>
      payload.count({ collection, where: collection === "words" ? { wpId: { in: WORD_IDS } } : { wpPath: { in: MEDIA_PATHS } } });
    expect((await count("words")).totalDocs).toBe(3);
    expect((await count("media")).totalDocs).toBe(5);

    // Relations: pass 2 links testwort to aasen and wa.
    const [a, w, t] = await Promise.all(WORD_IDS.map(findWord));
    expect(t.relatedWords).toEqual([a.id, w.id]);
    // Dates and status survive both runs.
    expect(a.contentModifiedAt).toBe("2026-09-20T17:24:19.000Z");
    expect(t.contentModifiedAt).toBe("2024-02-03T04:05:06.000Z");
    expect(a._status).toBe("published");
    expect(t._status).toBe("draft");
    expect(a.derived?.wordGroup).toBe("A");
    // The <img> in testwort's infoText was downloaded and is stored as an upload node.
    const info = await payload.find({ collection: "media", where: { wpPath: { equals: "2024/01/info-bild.png" } }, depth: 0 });
    expect(lexicalNodes(t.infoText, "upload")).toEqual([expect.objectContaining({ relationTo: "media", value: info.docs[0].id })]);
    // Media description is rich text: its link survives the import.
    const kueche = await payload.find({ collection: "media", where: { wpPath: { equals: "2024/01/Küche.png" } }, depth: 0 });
    expect(lexicalNodes(kueche.docs[0].description, "link")).toEqual([expect.objectContaining({ fields: expect.objectContaining({ url: "https://example.org/lizenz" }) })]);
    for (const word of [a, w, t]) expectNoPendingUploads(word.infoText);
    const [storedPost] = (await payload.find({ collection: "posts", where: { wpId: { equals: post.databaseId } }, depth: 0 })).docs;
    const [storedPage] = (await payload.find({ collection: "pages", where: { wpId: { equals: 990501 } }, depth: 0 })).docs;
    expect(storedPost.contentModifiedAt).toBe("2024-03-05T06:07:08.000Z");
    expectNoPendingUploads(storedPost.content);
    expectNoPendingUploads(storedPage.content);
    expect(lexicalNodes(storedPost.content, "upload")).toHaveLength(1);

    const nav = await payload.findGlobal({ slug: "navigation" });
    expect(nav.main).toEqual([expect.objectContaining({ title: "Start Main Menu", link: "/" })]);
    const company = await payload.findGlobal({ slug: "company" });
    expect(company.socialMedia).toEqual([expect.objectContaining({ network: "mastodon", label: "Mastodon", profile: "https://example.social/@bs" })]);
    const affiliate = await payload.findGlobal({ slug: "affiliate" });
    expect(affiliate.books).toEqual([expect.objectContaining({ title: "Buch" })]);
  });

  it("reports a media 404 and exits non-zero", async () => {
    mockWordPress();
    mockDownloads((url) => (url === PNG ? 404 : 200));
    const report = await runImport(payload, { only: ["media"] });
    expect(report.failures).toContainEqual(expect.objectContaining({ kind: "media", ref: PNG, error: expect.stringContaining("404") }));
    expect(exitCodeFor(report)).toBe(1);
    expect(exitCodeFor({ created: {}, updated: {}, missingRelated: 0, failures: [], warnings: [{ kind: "html-image", ref: "x", src: "y" }] })).toBe(0);
  });

  it("warns about words that WordPress no longer returns, without deleting them", async () => {
    mockWordPress();
    mockDownloads();
    const notInWp = (r: { warnings: { kind: string }[] }) => r.warnings.filter((w) => w.kind === "word-not-in-wp");
    expect(notInWp(await runImport(payload, { only: ["taxonomies", "words"] }))).toEqual([]);
    mockWordPress(undefined, [aasen]);
    const report = await runImport(payload, { only: ["taxonomies", "words"] });
    expect(notInWp(report)).toEqual([{ kind: "word-not-in-wp", ref: wa.slug, src: `wpId ${wa.databaseId}` }]);
    expect(await findWord(wa.databaseId)).toBeDefined();
    expect(exitCodeFor(report)).toBe(0);
  });

  it("imports WP drafts with empty slug and empty required fields", async () => {
    mockWordPress(() => page([testwort, ...emptyDrafts], "c2", false));
    mockDownloads();
    const report = await runImport(payload, { only: ["taxonomies", "words"] });
    expect(report.failures).toEqual([]);
    for (const { databaseId } of emptyDrafts) {
      const doc = await findWord(databaseId);
      expect(doc).toMatchObject({ slug: null, _status: "draft" });
    }
    // Re-run updates the drafts in place.
    expect((await runImport(payload, { only: ["taxonomies", "words"] })).failures).toEqual([]);
  });

  it("skips published words without a headword with a warning instead of failing", async () => {
    mockWordPress(() => page([testwort, emptyPublished], "c2", false));
    mockDownloads();
    const report = await runImport(payload, { only: ["taxonomies", "words"] });
    expect(report.failures).toEqual([]);
    expect(report.warnings).toContainEqual({ kind: "word-without-berlinerisch", ref: "baletti-machen-2", src: `wpId ${emptyPublished.databaseId}` });
    expect(await findWord(emptyPublished.databaseId)).toBeUndefined();
    expect(exitCodeFor(report)).toBe(0);
  });

  it("aborts the words phase when listing words fails mid-pagination", async () => {
    mockWordPress(() => {
      throw new Error("WP HTTP 504");
    });
    mockDownloads();
    const report = await runImport(payload, { only: ["taxonomies", "words"] });
    expect(report.failures).toContainEqual(expect.objectContaining({ kind: "words", error: expect.stringContaining("504") }));
    expect((await payload.count({ collection: "words", where: { wpId: { in: WORD_IDS } } })).totalDocs).toBe(0);
    expect(exitCodeFor(report)).toBe(1);
  });
});

describe("assertSafeImportTarget", () => {
  const db = (host: string) => `postgres://u:p@${host}:5432/x`;
  it("allows local hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) expect(() => assertSafeImportTarget({ DATABASE_URL: db(host) })).not.toThrow();
  });
  it("refuses non-local hosts without IMPORT_ALLOW_REMOTE_DB=1 and NODE_ENV=production", () => {
    expect(() => assertSafeImportTarget({ DATABASE_URL: db("postgres") })).toThrow(/IMPORT_ALLOW_REMOTE_DB/);
    expect(() => assertSafeImportTarget({ DATABASE_URL: db("db.example.com") })).toThrow(/IMPORT_ALLOW_REMOTE_DB/);
    expect(() => assertSafeImportTarget({ DATABASE_URL: db("db.example.com"), IMPORT_ALLOW_REMOTE_DB: "1" })).toThrow(/NODE_ENV=production/);
    expect(() => assertSafeImportTarget({ DATABASE_URL: db("db.example.com"), NODE_ENV: "production" })).toThrow(/IMPORT_ALLOW_REMOTE_DB/);
  });
  it("allows a remote host with both the flag and NODE_ENV=production", () => {
    expect(() => assertSafeImportTarget({ DATABASE_URL: db("db.example.com"), IMPORT_ALLOW_REMOTE_DB: "1", NODE_ENV: "production" })).not.toThrow();
  });
  it("refuses a missing or unparsable DATABASE_URL", () => {
    expect(() => assertSafeImportTarget({})).toThrow(/DATABASE_URL/);
    expect(() => assertSafeImportTarget({ DATABASE_URL: "not a url" })).toThrow(/DATABASE_URL/);
  });
});
