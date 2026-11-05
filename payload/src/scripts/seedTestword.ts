/**
 * Seeds `testwort`: one word with every field of the word detail page filled, plus partner words that the page
 * derives its sections from (anagram, similar sounding, similar spelling, neighbors). Idempotent (upsert by slug);
 * local databases only. Called by scripts/orca-setup.sh, rerun with `pnpm cms:seed-test`.
 * shortcut: no audio/gallery uploads (needs files), the gallery uses `wikimediaFiles` only; add media when needed.
 */
import { LOCAL_DB_HOSTS } from "../lib/localDb";

const url = process.env["DATABASE_URL"];
const host = url && URL.canParse(url) ? new URL(url).hostname : "";
if (!LOCAL_DB_HOSTS.has(host)) {
  console.error(`[seed-testword] refusing "${host || String(url)}": local database only`);
  process.exit(1);
}

const [{ getPayload }, { default: config }, { htmlToLexical }] = await Promise.all([
  import("payload"),
  import("../payload.config"),
  import("../lib/htmlToLexical"),
]);
const payload = await getPayload({ config });

async function upsert(
  collection: "words" | "word-types" | "themen",
  slug: string,
  data: Record<string, unknown>,
) {
  const { docs } = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    draft: true,
  } as never);
  const full = { slug, ...data };
  return (
    docs[0]
      ? payload.update({ collection, id: docs[0].id, data: full } as never)
      : payload.create({ collection, data: full } as never)
  ) as Promise<{ id: number }>;
}

const published = { _status: "published", publishedAt: new Date().toISOString() };

// Partners first: they must exist before `testwort` links to them.
const partners = await Promise.all(
  [
    ["wortstet", "Anagramm von testwort"],
    ["testwart", "Klingt wie testwort"],
    ["testwerk", "Ähnlich geschrieben wie testwort"],
  ].map(([berlinerisch, t]) =>
    upsert("words", berlinerisch!, {
      berlinerisch,
      translations: [{ translation: t }],
      ...published,
    }),
  ),
);
const types = await Promise.all(
  ["Nomen", "Verb"].map((name) => upsert("word-types", name.toLowerCase(), { name })),
);
const thema = await upsert("themen", "testthema", {
  name: "Testthema",
  description: "Nur für Dev.",
});

await upsert("words", "testwort", {
  berlinerisch: "testwort",
  article: "der",
  translations: [{ translation: "Prüfwort" }, { translation: "Beispielwort" }],
  alternativeWords: [{ alternativeWord: "testwörtchen" }],
  examples: [
    { example: "Dit is ein Testwort.", exampleExplanation: "Erklärung zum ersten Beispiel." },
    { example: "Zweet Beispiel, zweet Satz.", exampleExplanation: "Und noch eine Erklärung." },
  ],
  relatedWords: partners.map((p) => p.id),
  wikimediaFiles: [
    {
      wikimediaFile: "Berlin_Brandenburger_Tor.jpg",
      description: "Brandenburger Tor",
      caption: "Testbild",
    },
  ],
  infoText: await htmlToLexical(
    "<p>Bedeutung seit dem 19. Jahrhundert gebräuchlich.</p>",
    payload.config,
  ),
  learnMore: "https://de.wikipedia.org/wiki/Berlinerisch",
  berolinismus: true,
  sources: ["Testquelle 1", "Testquelle 2"],
  wordTypes: types.map((t) => t.id),
  themen: [thema.id],
  ...published,
});

console.log("[seed-testword] testwort and partner words ready: /wort/testwort");
process.exit(0);
