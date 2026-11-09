/**
 * Dev-only: adds ONE invented word, `testwort`, with every field filled so a single page shows every block of the
 * word page. Writes nothing else (the dev database is a prod-backup clone: never touch its real words). Never part of
 * the e2e/CI seed. Idempotent. Usage: `scripts/with-env.sh pnpm --filter payload-app seed:dev`.
 */
import type { Payload } from "payload";

import { LOCAL_DB_HOSTS } from "../lib/localDb";
import { berlinDay } from "../lib/wordStats";

/** Only a worktree's own dev database (`bsw_<workspace>`): not prod, not the throwaway e2e/smoke/test databases. */
export function assertDevDatabase(url: string | undefined): void {
  const parsed = url && URL.canParse(url) ? new URL(url) : undefined;
  const name = parsed?.pathname.slice(1) ?? "";
  if (!parsed || !LOCAL_DB_HOSTS.has(parsed.hostname) || !/^bsw_/.test(name) || /_(e2e|smoke|test)$/.test(name)) {
    throw new Error(`Refusing to seed "${name || String(url)}": only a local worktree dev database (bsw_<workspace>) is allowed`);
  }
}

const text = (value: string) => ({ detail: 0, format: 0, mode: "normal", style: "", text: value, type: "text", version: 1 });
const lexical = (value: string) =>
  ({ root: { children: [{ children: [text(value)], direction: "ltr", format: "", indent: 0, textFormat: 0, type: "paragraph", version: 1 }], direction: "ltr", format: "", indent: 0, type: "root", version: 1 } }) as never;

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// 0.3 s of silence (8 kHz, 8 bit mono WAV): a playable file for the voice buttons.
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

const link = (label: string, url: string) => ({ children: [text(label)], direction: "ltr", fields: { linkType: "custom", newTab: true, url }, format: "", indent: 0, type: "link", version: 3 });

export async function seedDev(payload: Payload): Promise<void> {
  const media = async (wpPath: string, data: Record<string, unknown>, file: { data: Buffer; mimetype: string }): Promise<number> => {
    const found = await payload.find({ collection: "media", depth: 0, limit: 1, where: { wpPath: { equals: wpPath } } });
    if (found.docs[0]) return (await payload.update({ collection: "media", data, depth: 0, id: found.docs[0].id })).id;
    const name = wpPath.split("/").pop()!;
    return (await payload.create({ collection: "media", data: { ...data, wpPath }, file: { ...file, name, size: file.data.length } } as never)).id;
  };

  // Four images with the credit variants of the CMS convention: plain, with a link, caption only, none.
  const png = { data: PNG, mimetype: "image/png" };
  const images = [
    await media("dev/testwort-1.png", { alt: "Testbild", caption: "Ein Testbild", description: lexical("Erfundene Attribution: Beispielfoto, CC BY 4.0") }, png),
    await media("dev/testwort-2.png", { alt: "Zweites Testbild", caption: "Ein zweites Testbild", description: { root: { children: [{ children: [text("Erfundene Attribution: "), link("Beispielquelle", "https://example.org/quelle")], direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1 }], direction: "ltr", format: "", indent: 0, type: "root", version: 1 } } }, png),
    await media("dev/testwort-3.png", { alt: "Drittes Testbild", caption: "Credit: Erfundene_Person", description: null }, png),
    await media("dev/testwort-4.png", { alt: "Viertes Testbild", caption: null, description: null }, png),
  ];
  const wav = { data: WAV, mimetype: "audio/wav" };
  const voices = { male: await media("dev/testwort-stimme-m.wav", { alt: "Stimme male" }, wav), female: await media("dev/testwort-stimme-w.wav", { alt: "Stimme female" }, wav) };
  const audio = (...genders: ("female" | "male")[]) => genders.map((gender) => ({ audio: voices[gender], gender }));

  // Reuse the dev database's own themen and related words; the word works without them.
  const themen = (await payload.find({ collection: "themen", depth: 0, limit: 3, sort: "slug" })).docs.map((t) => t.id);
  const related = (await payload.find({ collection: "words", depth: 0, limit: 4, sort: "slug", where: { slug: { not_equals: "testwort" } } })).docs.map((w) => w.id);

  const typeSlug = "substantiv";
  const found = await payload.find({ collection: "word-types", depth: 0, limit: 1, where: { slug: { equals: typeSlug } } });
  const wordType = found.docs[0] ?? (await payload.create({ collection: "word-types", data: { name: "Substantiv", slug: typeSlug }, depth: 0 }));

  const data = {
    _status: "published" as const,
    alternativeWords: [{ alternativeWord: "Probewort" }, { alternativeWord: "Prüfwort" }],
    berlinerisch: "Testwort",
    berlinerischAudio: audio("male", "female"),
    berolinismus: true,
    examples: [
      { example: "Dit is ejentlich nur'n Testwort.", exampleAudio: audio("male", "female"), exampleExplanation: "Das ist eigentlich nur ein Testwort." },
      { example: "Mit dem Testwort kiekste allet an.", exampleAudio: audio("female"), exampleExplanation: "Damit siehst du alle Elemente." },
      { example: "Noch'n Beispiel ohne Erklärung.", exampleAudio: audio("male") },
    ],
    images,
    infoText: lexical("Erfundener Infotext: Das Testwort zeigt jeden Block der Wortseite. Diese Herkunftsangabe ist frei erfunden."),
    learnMore: "https://example.org/testwort",
    publishedAt: "2025-01-01T00:00:00.000Z",
    relatedWords: related,
    slug: "testwort",
    sources: ["Erfundene Testquelle A", "https://example.org/quelle-b"],
    themen,
    translations: ["Probe", "Versuch", "Prüfstein", "Muster", "Beispielwort", "Platzhalter"].map((translation) => ({ translation })),
    wordTypes: [wordType.id],
  };
  const existing = await payload.find({ collection: "words", depth: 0, draft: true, limit: 1, where: { slug: { equals: "testwort" } } });
  const word = existing.docs[0]
    ? await payload.update({ collection: "words", data, depth: 0, draft: false, id: existing.docs[0].id })
    : await payload.create({ collection: "words", data, depth: 0, draft: false });

  // Trend box: 500 views in the last 7 days, 50 the week before (clearly rising, high in the top 10 of any dev database).
  const today = Date.parse(`${berlinDay()}T00:00:00Z`);
  const dayOf = (back: number) => new Date(today - back * 864e5).toISOString().slice(0, 10);
  const rows = [...[60, 70, 80, 70, 90, 60, 70].map((views, i) => [dayOf(6 - i), views] as const), [dayOf(10), 50] as const];
  for (const [day, views] of rows) {
    const { docs } = await payload.find({ collection: "word-stats", depth: 0, limit: 1, where: { day: { equals: day }, word: { equals: word.id } } });
    if (docs[0]) await payload.update({ collection: "word-stats", data: { views }, depth: 0, id: docs[0].id });
    else await payload.create({ collection: "word-stats", data: { day, views, word: word.id }, depth: 0 });
  }
}

// CLI entry (`payload run src/seed/dev.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }] = await Promise.all([import("payload"), import("../payload.config")]);
  await seedDev(await getPayload({ config }));
  console.log("[seed] dev word /wort/testwort ready");
  process.exit(0);
}
