import type { SanitizedConfig } from "payload";

import { beforeAll, describe, expect, it } from "vitest";

import type { ImportRefs } from "../../src/import/mappers";
import type { WpPost, WpWord } from "../../src/import/wp";

import { collectMedia, mapRelatedWords, mapSeo, mapWord } from "../../src/import/mappers";
import { wpUploadPath } from "../../src/lib/wpUploadPath";
import { lexicalNodes } from "../helpers/lexical";
import { getTestPayload } from "../helpers/payload";
import aasen from "./fixtures/word-aasen.json";
import post from "./fixtures/post.json";
import testwort from "./fixtures/word-testwort.json";
import wa from "./fixtures/word-wa.json";

const AUDIO = "https://cms.berliner-schnauze.wtf/wp-content/uploads/import_testwort.mp3";
const PNG = "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/K%C3%BCche.png";

const refs = (): ImportRefs => ({
  mediaIdByUrl: new Map([
    [wpUploadPath(AUDIO), 11],
    [wpUploadPath(PNG), 12],
  ]),
  wordTypeIdByName: new Map([["Substantiv", 21]]),
  themaIdBySlug: new Map([
    ["geld", 31],
    ["koerper", 32],
  ]),
  wordIdByWpId: new Map([
    [5704, 41],
    [4671, 42],
  ]),
});

let config: SanitizedConfig;
beforeAll(async () => {
  config = (await getTestPayload()).config;
});

describe("mapWord", () => {
  it("maps aasen", async () => {
    const doc = await mapWord(aasen as WpWord, refs(), config);
    expect(doc).toMatchObject({
      slug: "aasen",
      wpId: 5704,
      berlinerisch: "aasen",
      _status: "published",
      publishedAt: "2025-04-09T12:18:58.000Z",
      contentModifiedAt: "2026-09-20T17:24:19.000Z",
      alternativeWords: [{ alternativeWord: "veraasen" }],
      themen: [31, 32],
      wordTypes: [],
    });
    expect(doc.translations?.[0].translation).toBe(aasen.wordProperties.translations[0].translation);
    // Fixture text (the brief's sentence belongs to `aasig`, not `aasen`).
    const first = (doc.infoText?.root.children[0] as unknown as { children: { text: string }[] }).children[0];
    expect(first.text).toBe("Bedeutung seit dem 19. Jahrhundert gebräuchlich.");
    expect(doc).not.toHaveProperty("relatedWords");
    expect(doc).not.toHaveProperty("wordGroup");
  });

  it("maps wa (no infoText -> null)", async () => {
    const doc = await mapWord(wa as WpWord, refs(), config);
    expect(doc.examples).toEqual([{ example: "Is aba warm heute, wa?", exampleExplanation: null, exampleAudio: [] }]);
    expect(doc.infoText).toBeNull();
  });

  it("maps audio, media, sources and draft status", async () => {
    const unmapped: string[] = [];
    const doc = await mapWord(testwort as WpWord, refs(), config, (src) => unmapped.push(src));
    // info-bild.png is not in refs: it becomes a link and is reported.
    expect(unmapped).toEqual(["https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/info-bild.png"]);
    expect(lexicalNodes(doc.infoText, "upload")).toEqual([]);
    expect(lexicalNodes(doc.infoText, "link")).toHaveLength(1);
    expect(doc._status).toBe("draft");
    expect(doc.examples?.[0].exampleAudio).toEqual([{ gender: "male", audio: 11 }]);
    expect(doc.berlinerischAudio).toEqual([{ gender: "female", audio: 11 }]);
    expect(doc.sources).toEqual(["Quelle A", "Quelle B", "Quelle C"]);
    expect(doc.images).toEqual([12]); // the unmapped pdf and the foreign image are dropped
    expect(doc.wordTypes).toEqual([21]);
    expect(doc.meta?.image).toBe(12);
  });
});

describe("mapRelatedWords", () => {
  it("maps known ids and reports missing ones", () => {
    expect(mapRelatedWords(testwort as WpWord, refs())).toEqual({ ids: [41, 42], missing: 1 });
    expect(mapRelatedWords(aasen as WpWord, refs())).toEqual({ ids: [], missing: 0 });
  });
});

describe("mapSeo", () => {
  it("maps Yoast robots strings and empty strings", () => {
    expect(mapSeo(testwort.seo, refs())).toMatchObject({ noindex: true, nofollow: true, title: "Import-Testwort", canonical: null, image: 12 });
    expect(mapSeo(aasen.seo, refs())).toMatchObject({ noindex: false, nofollow: false, description: aasen.seo.metaDesc });
    // Yoast's self-canonical on the WordPress host is dropped, a real override is kept
    expect(mapSeo(aasen.seo, refs()).canonical).toBeNull();
    expect(mapSeo({ canonical: "https://berliner-schnauze.wtf/wort/aas" }, refs()).canonical).toBe("https://berliner-schnauze.wtf/wort/aas");
    expect(mapSeo({ metaRobotsNoindex: " NoIndex, follow ", metaRobotsNofollow: "noindex, nofollow" }, refs())).toMatchObject({ noindex: true, nofollow: true });
  });

  it("takes Yoast's generated og:description when no meta description is set", () => {
    expect(mapSeo({ metaDesc: "", opengraphDescription: "Aus dem Inhalt" }, refs()).description).toBe("Aus dem Inhalt");
    expect(mapSeo({ metaDesc: "Eigene", opengraphDescription: "Aus dem Inhalt" }, refs()).description).toBe("Eigene");
  });

  it("resets every field when WordPress has no SEO block", () => {
    expect(mapSeo(null, refs())).toEqual({
      title: null,
      description: null,
      canonical: null,
      image: null,
      noindex: false,
      nofollow: false,
    });
  });
});

describe("collectMedia urls", () => {
  it("collects audio, images, og and featured images, deduplicated by upload path", () => {
    const urls = [...collectMedia([aasen, wa, testwort] as WpWord[], [post as WpPost], [], []).values()].map((m) => m.url);
    expect(urls.sort()).toEqual(
      [
        AUDIO,
        PNG,
        "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/handout.pdf",
        "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/03/titelbild.png",
        "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/03/bild.png",
        // <img> in infoText; the foreign word image is collected (the run skips it with a warning),
        // the external <img> in the post HTML is not (no WP upload).
        "https://cms.berliner-schnauze.wtf/wp-content/uploads/2024/01/info-bild.png",
        "https://example.com/fremd.jpg",
      ].sort(),
    );
  });
});

describe("collectMedia", () => {
  it("stores image caption as plain text and keeps the description as HTML for the rich text field", () => {
    const node = {
      databaseId: 990700,
      wordProperties: {
        images: {
          nodes: [
            {
              sourceUrl: "https://cms.berliner-schnauze.wtf/wp-content/uploads/Denkmal.jpg",
              altText: "",
              caption: "<p>Das Nationale Freiheits und Einheitsdenkmal</p>\n",
              description: "<p>Milla&#038;Partner, CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0>, via Wikimedia Commons</p>\n",
            },
          ],
        },
      },
    } as unknown as WpWord;
    expect(collectMedia([node], [], [], []).get("Denkmal.jpg")).toMatchObject({
      caption: "Das Nationale Freiheits und Einheitsdenkmal",
      description: "<p>Milla&#038;Partner, CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0>, via Wikimedia Commons</p>",
    });
  });
});
