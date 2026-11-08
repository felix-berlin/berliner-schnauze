/**
 * Seeds a small, invented data set for the Playwright e2e run (CI cannot use real word data: the repo is
 * public). Idempotent. Usage: `pnpm --filter payload-app seed:e2e` against a throwaway database.
 */
import type { Payload } from "payload";

import type { Word } from "../payload-types";

import { affiliate, company, navigation } from "./siteData";
import { LOCAL_DB_HOSTS } from "../lib/localDb";
import { berlinDay } from "../lib/wordStats";

/** Slugs the e2e specs navigate to directly. */
export const E2E_WORD_SLUGS = ["aasen", "akademiebusen", "alex", "alsche", "anmachen", "ballast-der-republik", "bildeins", "bildzwei", "schale", "wa"] as const;

/** The seed writes invented words: never let it near a real database. */
export function assertLocalDatabase(url: string | undefined): void {
  const parsed = url && URL.canParse(url) ? new URL(url) : undefined;
  const host = parsed?.hostname ?? "";
  // "postgres": the compose service (docker-smoke)
  if (!LOCAL_DB_HOSTS.has(host) && host !== "postgres") {
    throw new Error(`Refusing to seed "${host || String(url)}": only a local or compose database is allowed`);
  }
  // The production compose database is "local" too: only throwaway databases (CI: bs_e2e, docker-smoke: bs_smoke).
  if (!/_(e2e|smoke)$/.test(parsed!.pathname.slice(1))) {
    throw new Error(`Refusing to seed database "${parsed!.pathname.slice(1)}": its name must end in _e2e or _smoke`);
  }
}

/** Every slug/path the seed writes, so a test can remove exactly this data again from a shared database. */
export const SEEDED = {
  media: ["e2e/galerie.png", "e2e/stimme-m.wav", "e2e/stimme-w.wav"],
  pages: ["datenschutz", "impressum"],
  posts: ["berlinerisch-fuer-anfaenger"],
};

const THEMEN = [
  ["essen-trinken", "Essen & Trinken"],
  ["kneipe-alkohol", "Kneipe & Alkohol"],
  ["alltag-wohnen", "Alltag & Wohnen"],
  ["bewegung-gehen", "Bewegung & Gehen"],
  ["beziehungen-soziales", "Beziehungen & Soziales"],
  ["arbeit-geld", "Arbeit & Geld"],
  ["gefuehle-charakter", "Gefühle & Charakter"],
  ["berlin-orte", "Berlin & Orte"],
  ["kleidung-aussehen", "Kleidung & Aussehen"],
  ["tiere-natur", "Tiere & Natur"],
] as const;

type SeedWord = {
  alternativeWords?: string[];
  /** Voices of the word itself; `exampleVoices` on the first example. */
  voices?: ("female" | "male")[];
  berlinerisch: string;
  berolinismus?: boolean;
  examples?: { example: string; explanation?: string; voices?: ("female" | "male")[] }[];
  /** How many of the four seed images (see above) the word shows. */
  images?: number;
  infoText?: string;
  learnMore?: string;
  related?: string[];
  slug: string;
  sources?: string[];
  themen?: string[];
  translations: string[];
};

const WORDS: SeedWord[] = [
  { berlinerisch: "aasen", voices: ["male"], infoText: "Erfundener Infotext: das Verb ist im Beispieldatensatz nur für die Tests da.", slug: "aasen", themen: ["alltag-wohnen"], translations: ["verschwenden", "vergeuden"], alternativeWords: ["veraasen"], examples: [{ example: "Aase nich so mit dem Wasser.", explanation: "Verschwende das Wasser nicht." }] },
  { berlinerisch: "ab", slug: "ab", themen: ["bewegung-gehen"], translations: ["weg"] },
  { berlinerisch: "Akademiebusen", images: 4, slug: "akademiebusen", themen: ["kleidung-aussehen"], translations: ["Zierfransen am Kleid"] },
  { berlinerisch: "Bildeins", images: 1, learnMore: "https://example.org/mehr", slug: "bildeins", translations: ["Testwort mit einem Bild"] },
  { berlinerisch: "Bildzwei", images: 2, slug: "bildzwei", translations: ["Testwort mit zwei Bildern"] },
  { berlinerisch: "Alex", berolinismus: true, slug: "alex", themen: ["berlin-orte"], translations: ["Kurzform für den Alexanderplatz"] },
  { berlinerisch: "Alsche", slug: "alsche", translations: ["Testwort für Anagramme"] },
  { berlinerisch: "schale", slug: "schale", themen: ["essen-trinken"], translations: ["flaches Gefäß"] },
  {
    alternativeWords: ["anknipsen"],
    berlinerisch: "anmachen",
    voices: ["male", "female"],
    examples: [
      { example: "Mach ma det Licht an.", explanation: "Schalte das Licht ein.", voices: ["male", "female"] },
      { example: "Der hat mich anjemacht.", explanation: "Er hat mich forsch angesprochen." },
    ],
    learnMore: "https://example.org/anmachen",
    related: ["wa"],
    slug: "anmachen",
    sources: ["Erfundene Testquelle"],
    themen: ["beziehungen-soziales", "alltag-wohnen"],
    translations: ["einschalten", "sich jemandem forsch nähern"],
  },
  { berlinerisch: "anmachn", slug: "anmachn", themen: ["beziehungen-soziales"], translations: ["Kurzform von anmachen"] },
  { berlinerisch: "Ballast der Republik", related: ["aasen", "alex"], slug: "ballast-der-republik", themen: ["berlin-orte"], translations: ["Spitzname für ein Gebäude"] },
  { berlinerisch: "wa", slug: "wa", translations: ["nicht wahr"] },
  { berlinerisch: "Anmache", slug: "anmache", themen: ["beziehungen-soziales"], translations: ["plumpe Annäherung", "Versuch, sich jemandem zu nähern"] },
  { berlinerisch: "Anmacher", slug: "anmacher", themen: ["beziehungen-soziales"], translations: ["wer sich aufdringlich nähern will"] },
  { berlinerisch: "Bordstein", slug: "bordstein", themen: ["berlin-orte"], translations: ["Kante der Straße"] },
  { berlinerisch: "abbeißen", slug: "abbeissen", themen: ["essen-trinken"], translations: ["mit den Zähnen abtrennen"] },
  { berlinerisch: "Abbeißer", slug: "abbeisser", themen: ["essen-trinken"], translations: ["wer gern zubeißt"] },
  { berlinerisch: "Bolle", slug: "bolle", themen: ["essen-trinken"], translations: ["Zwiebel"] },
  { berlinerisch: "Bammel", slug: "bammel", themen: ["gefuehle-charakter"], translations: ["Angst"] },
  { berlinerisch: "Berolina", berolinismus: true, slug: "berolina", themen: ["berlin-orte"], translations: ["Frauenfigur als Stadtsymbol"] },
  { berlinerisch: "Bulette", slug: "bulette", themen: ["essen-trinken"], translations: ["gebratene Hackfleischkugel"] },
  { berlinerisch: "Büdchen", slug: "buedchen", themen: ["alltag-wohnen"], translations: ["Kiosk an der Ecke"] },
  { berlinerisch: "Dette", slug: "dette", translations: ["das"] },
  { berlinerisch: "Icke", slug: "icke", translations: ["ich"] },
  { berlinerisch: "Kiez", slug: "kiez", themen: ["berlin-orte"], translations: ["Stadtviertel"] },
  { berlinerisch: "Kneipe", slug: "kneipe", themen: ["kneipe-alkohol"], translations: ["einfache Gaststätte"] },
  { berlinerisch: "Mädel", slug: "maedel", themen: ["beziehungen-soziales"], translations: ["junge Frau"] },
  { berlinerisch: "Pflaster", slug: "pflaster", themen: ["berlin-orte"], translations: ["Belag der Straße"] },
  { berlinerisch: "Schrippe", slug: "schrippe", themen: ["essen-trinken"], translations: ["Brötchen"] },
  { berlinerisch: "Stulle", slug: "stulle", themen: ["essen-trinken"], translations: ["belegtes Brot"] },
  { berlinerisch: "Ulk", slug: "ulk", themen: ["gefuehle-charakter"], translations: ["Spaß"] },
  { berlinerisch: "Zille", slug: "zille", themen: ["berlin-orte", "tiere-natur"], translations: ["Lastkahn auf der Spree"] },
];

/** Slugs of all seeded words and themen. */
export const seededSlugs = () => ({ themen: THEMEN.map(([slug]) => slug), words: WORDS.map((w) => w.slug) });

const text = (value: string) => ({ detail: 0, format: 0, mode: "normal", style: "", text: value, type: "text", version: 1 });
const heading = (value: string) => ({ children: [text(value)], direction: "ltr", format: "", indent: 0, tag: "h1", type: "heading", version: 1 });
const paragraph = (value: string) => ({ children: [text(value)], direction: "ltr", format: "", indent: 0, textFormat: 0, type: "paragraph", version: 1 });
const lexical = (...children: unknown[]) => ({ root: { children, direction: "ltr", format: "", indent: 0, type: "root", version: 1 } }) as never;

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// 0.3 s of silence (8 kHz, 8 bit mono WAV): a real, playable audio file for the voice buttons.
const WAV = (() => {
  const data = Buffer.alloc(2400, 128);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(8000, 24);
  head.writeUInt32LE(8000, 28);
  head.writeUInt16LE(1, 32);
  head.writeUInt16LE(8, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
})();

/** `find` by `where`, then `update` or `create`: the seed can run any number of times. */
async function upsert(payload: Payload, collection: "themen" | "words" | "posts" | "pages", where: Record<string, unknown>, data: Record<string, unknown>): Promise<{ id: number }> {
  // `draft` only for collections with drafts (strictDraftTypes); the union of slugs is too wide to type the calls.
  const drafts = collection === "words" || collection === "posts";
  const { docs } = await payload.find({ collection, depth: 0, limit: 1, where, ...(drafts && { draft: true }) } as never);
  const options = { collection, data, depth: 0, ...(drafts && { draft: false }) };
  return (docs[0] ? payload.update({ ...options, id: docs[0].id } as never) : payload.create(options as never)) as Promise<{ id: number }>;
}

export async function seedE2e(payload: Payload): Promise<void> {
  // Media: four images for the word page and the post. Credits follow the CMS convention (description = attribution,
  // caption = fallback): plain, with a link, caption only, none.
  const imageMedia: { id: number }[] = [];
  for (const [i, data] of [
    { alt: "Testbild", caption: "Ein Testbild", description: lexical(paragraph("Erfundene Attribution: Beispielfoto, CC BY 4.0")) },
    {
      alt: "Zweites Testbild",
      caption: "Ein zweites Testbild",
      description: lexical({ children: [text("Erfundene Attribution: "), { children: [text("Beispielquelle")], direction: "ltr", fields: { linkType: "custom", newTab: true, url: "https://example.org/quelle" }, format: "", indent: 0, type: "link", version: 3 }], direction: "ltr", format: "", indent: 0, textFormat: 0, type: "paragraph", version: 1 }),
    },
    { alt: "Drittes Testbild", caption: "Credit: Erfundene_Person", description: null },
    { alt: "Viertes Testbild", caption: null, description: null },
  ].entries()) {
    const wpPath = i === 0 ? "e2e/galerie.png" : `e2e/galerie-${i + 1}.png`;
    const found = await payload.find({ collection: "media", depth: 0, limit: 1, where: { wpPath: { equals: wpPath } } });
    imageMedia.push(
      found.docs[0]
        ? await payload.update({ collection: "media", data, depth: 0, id: found.docs[0].id })
        : await payload.create({ collection: "media", data: { ...data, wpPath }, file: { data: PNG, mimetype: "image/png", name: wpPath.slice(4), size: PNG.length } }),
    );
  }
  const media = imageMedia[0]!;

  // Two voices: one silent WAV each.
  const voiceMedia = new Map<"female" | "male", number>();
  for (const [gender, name] of [["male", "stimme-m"], ["female", "stimme-w"]] as const) {
    const wpPath = `e2e/${name}.wav`;
    const found = await payload.find({ collection: "media", depth: 0, limit: 1, where: { wpPath: { equals: wpPath } } });
    const doc =
      found.docs[0] ??
      (await payload.create({
        collection: "media",
        data: { alt: `Stimme ${gender}`, wpPath },
        file: { data: WAV, mimetype: "audio/wav", name: `${name}.wav`, size: WAV.length },
      }));
    voiceMedia.set(gender, doc.id);
  }
  const audioRows = (voices: ("female" | "male")[] = []) => voices.map((gender) => ({ audio: voiceMedia.get(gender)!, gender }));

  const themaIds = new Map<string, number>();
  for (const [slug, name] of THEMEN) {
    const doc = await upsert(payload, "themen", { slug: { equals: slug } }, { description: `Beispielwörter zum Thema ${name}.`, name, slug });
    themaIds.set(slug, doc.id);
  }

  const wordIds = new Map<string, number>();
  for (const w of WORDS) {
    const data: Partial<Word> & Record<string, unknown> = {
      _status: "published",
      alternativeWords: (w.alternativeWords ?? []).map((alternativeWord) => ({ alternativeWord })),
      berlinerisch: w.berlinerisch,
      berlinerischAudio: audioRows(w.voices),
      berolinismus: w.berolinismus ?? false,
      examples: (w.examples ?? []).map((e) => ({ example: e.example, exampleAudio: audioRows(e.voices), exampleExplanation: e.explanation })),
      images: imageMedia.slice(0, w.images ?? 0).map((m) => m.id),
      infoText: w.infoText ? lexical(paragraph(w.infoText)) : null,
      learnMore: w.learnMore ?? null,
      publishedAt: "2025-01-01T00:00:00.000Z",
      slug: w.slug,
      sources: w.sources ?? [],
      themen: (w.themen ?? []).map((t) => themaIds.get(t)!),
      translations: w.translations.map((translation) => ({ translation })),
    };
    wordIds.set(w.slug, (await upsert(payload, "words", { slug: { equals: w.slug } }, data)).id);
  }
  // Second pass: related words need every id.
  for (const w of WORDS.filter((x) => x.related)) {
    await payload.update({ collection: "words", data: { relatedWords: w.related!.map((s) => wordIds.get(s)!) }, depth: 0, draft: false, id: wordIds.get(w.slug)! });
  }

  // Invented views for the trend box: alex is #1 of the week (47 views, +370 % to the week before), anmachen #2, aasen #3 (12), eight fillers (10) behind.
  const STATS: [string, number[], number][] = [
    ["alex", [3, 5, 4, 8, 6, 9, 12], 10],
    ["anmachen", [1, 2, 3, 3, 4, 3, 4], 20],
    ["aasen", [1, 2, 1, 3, 2, 1, 2], 2],
    // Eight fillers with 10 views each: with them "wa" (a few views from the pulse tests) is outside the top 10.
    ...["kiez", "kneipe", "bolle", "bulette", "bammel", "ulk", "zille", "stulle"].map((s): [string, number[], number] => [s, [2, 1, 2, 1, 1, 2, 1], 0]),
  ];
  const today = Date.parse(`${berlinDay()}T00:00:00Z`);
  const dayOf = (back: number) => new Date(today - back * 864e5).toISOString().slice(0, 10);
  for (const [slug, week, before] of STATS) {
    const word = wordIds.get(slug)!;
    // Last 7 days oldest first, then the previous week as one row on its first day.
    const rows = [...week.map((views, i) => [dayOf(6 - i), views] as const), [dayOf(10), before] as const];
    for (const [day, views] of rows) {
      const { docs } = await payload.find({ collection: "word-stats", depth: 0, limit: 1, where: { day: { equals: day }, word: { equals: word } } });
      if (docs[0]) await payload.update({ collection: "word-stats", data: { views }, depth: 0, id: docs[0].id });
      else await payload.create({ collection: "word-stats", data: { day, views, word }, depth: 0 });
    }
  }

  await upsert(payload, "posts", { slug: { equals: "berlinerisch-fuer-anfaenger" } }, {
    _status: "published",
    content: lexical(
      paragraph("Ein erfundener Artikel für die Tests."),
      { fields: null, format: "", relationTo: "media", type: "upload", value: media.id, version: 3 },
      { children: [text("Ein erfundenes Zitat.")], direction: "ltr", format: "", indent: 0, type: "quote", version: 1 },
      paragraph("Und noch ein Absatz am Ende."),
    ),
    excerpt: "Ein erfundener Artikel für die Tests.",
    featuredImage: media.id,
    publishedAt: "2025-05-01T08:00:00.000Z",
    slug: "berlinerisch-fuer-anfaenger",
    title: "Berlinerisch für Anfänger",
  });

  for (const [slug, title] of [["datenschutz", "Datenschutz"], ["impressum", "Impressum"]] as const) {
    await upsert(payload, "pages", { slug: { equals: slug } }, { content: lexical(heading(title), paragraph(`Erfundener Text der Seite ${title}.`)), slug, title });
  }

  await payload.updateGlobal({ data: navigation as never, slug: "navigation" });
  await payload.updateGlobal({ data: company as never, slug: "company" });
  await payload.updateGlobal({ data: affiliate as never, slug: "affiliate" });
}

// CLI entry (`payload run src/seed/e2e.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  assertLocalDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }] = await Promise.all([import("payload"), import("../payload.config")]);
  await seedE2e(await getPayload({ config }));
  console.log("[seed] e2e data ready");
  process.exit(0);
}
