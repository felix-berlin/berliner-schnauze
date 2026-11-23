/**
 * Copies the old origin text (`infoText`, rich text) of every published word into the word page v18's "Wissenswertes"
 * (`facts`), with its formatting, and the word's `sources` as the entry's `source`. The old etymology card is gone; the
 * facts are what the page shows now. `infoText` and `sources` stay untouched (a later release drops them).
 *
 * Without `--write` it only counts and prints samples. Idempotent: a word that already has a fact with the identical
 * text is skipped. A save keeps `contentModifiedAt` (no sitemap lastmod churn). Drafts are not touched.
 *
 * Usage: `pnpm --filter payload-app exec payload run src/scripts/infoTextToFacts.ts -- [--kind=herkunft] [--write]`
 * (run with the database of the target environment; kinds: herkunft, geschichte, gebrauch, anekdote, sonstiges).
 */
// Makes this file a module (top-level await).
export {};

const [{ getPayload }, { default: config }, { PRESERVE_CONTENT_MODIFIED_AT }, { hasLexicalText }] =
  await Promise.all([
    import("payload"),
    import("../payload.config"),
    import("../fields/contentModified"),
    import("../lib/routes"),
  ]);

const KINDS = ["herkunft", "geschichte", "gebrauch", "anekdote", "sonstiges"] as const;
type Kind = (typeof KINDS)[number];
const SOURCE_MAX = 200;

const args = process.argv.slice(2).filter((a) => a !== "--");
const write = args.includes("--write");
const kindArg = args.find((a) => a.startsWith("--kind="))?.slice("--kind=".length) ?? "herkunft";
if (!KINDS.includes(kindArg as Kind)) throw new Error(`--kind must be one of ${KINDS.join(", ")}`);
const kind = kindArg as Kind;

/** Counts nodes of one type in a Lexical state (to name what a copy keeps: links, lists, italics). */
const count = (node: unknown, test: (n: Record<string, unknown>) => boolean): number =>
  typeof node === "object" && node !== null
    ? (test(node as Record<string, unknown>) ? 1 : 0) +
      Object.values(node).reduce<number>((sum, v) => sum + count(v, test), 0)
    : 0;

const payload = await getPayload({ config });
const words = await payload.find({
  collection: "words",
  depth: 0,
  draft: false,
  limit: 0,
  overrideAccess: true,
  pagination: false,
  where: { _status: { equals: "published" }, infoText: { exists: true } },
});

const stats = {
  alreadyThere: 0,
  copied: 0,
  empty: 0,
  failed: 0,
  links: 0,
  lists: 0,
  noSource: 0,
  tooLongSource: 0,
};
const samples: string[] = [];
for (const word of words.docs) {
  if (!hasLexicalText(word.infoText)) {
    stats.empty++;
    continue;
  }
  const text = JSON.stringify(word.infoText);
  if ((word.facts ?? []).some((f) => JSON.stringify(f.text) === text)) {
    stats.alreadyThere++;
    continue;
  }
  const source = (word.sources ?? []).join("; ");
  if (!source) stats.noSource++;
  if (source.length > SOURCE_MAX) stats.tooLongSource++;
  stats.links += count(word.infoText, (n) => n.type === "link");
  stats.lists += count(word.infoText, (n) => n.type === "list");
  if (samples.length < 5) samples.push(`${word.slug} | ${source || "(no source)"}`);
  if (!write) {
    stats.copied++;
    continue;
  }
  try {
    // oxlint-disable-next-line no-await-in-loop -- one save at a time keeps the hooks and the log readable
    await payload.update({
      collection: "words",
      context: { [PRESERVE_CONTENT_MODIFIED_AT]: true },
      data: {
        contentModifiedAt: word.contentModifiedAt,
        facts: [
          ...(word.facts ?? []),
          { kind, ...(source && { source: source.slice(0, SOURCE_MAX) }), text: word.infoText },
        ],
      },
      depth: 0,
      draft: false,
      id: word.id,
      overrideAccess: true,
    });
    stats.copied++;
  } catch (error) {
    stats.failed++;
    console.error(`[infoText] ${word.slug}:`, error instanceof Error ? error.message : error);
  }
}

console.log(`[infoText] ${write ? "written" : "dry run (pass --write)"}, kind ${kind}`, stats);
console.log(`[infoText] samples:\n${samples.join("\n")}`);
process.exit(stats.failed > 0 ? 1 : 0);
