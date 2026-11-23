/**
 * Copies the old origin text (`infoText`, rich text) of every published word into the word page v18's "Wissenswertes"
 * (`facts`), with its formatting, and the word's `sources` as the entry's `source`. The old etymology card is gone; the
 * facts are what the page shows now. `infoText` and `sources` stay untouched (a later release drops them).
 *
 * Without `--write` it only counts and prints samples. Idempotent: a word that already has a fact with the identical
 * text is skipped. A save keeps `contentModifiedAt` (no sitemap lastmod churn). A word with a newer draft is SKIPPED
 * and listed (`hasDraft`): an update merges into the latest version, so it would publish that draft and replace its
 * draft-only facts. Publish or discard the draft, then run the script again. The decision per word lives in
 * `lib/infoTextToFact.ts` (unit-tested).
 *
 * The same copy runs on deploy as migration `info_text_to_facts`; this script is for re-runs (skipped drafts) and dry runs.
 *
 * Usage: `pnpm --filter payload-app exec payload run src/scripts/infoTextToFacts.ts -- [--kind=herkunft] [--write]`
 * (run with the database of the target environment; kinds: herkunft, geschichte, gebrauch, anekdote, sonstiges).
 */
// Makes this file a module (top-level await).
export {};

const [{ getPayload }, { default: config }, { copyInfoTextToFacts }, { parseFactKind }] =
  await Promise.all([
    import("payload"),
    import("../payload.config"),
    import("../lib/copyInfoTextToFacts"),
    import("../lib/infoTextToFact"),
  ]);

const args = process.argv.slice(2).filter((a) => a !== "--");
const write = args.includes("--write");
const kind = parseFactKind(
  args.find((a) => a.startsWith("--kind="))?.slice("--kind=".length) ?? "herkunft",
);

const payload = await getPayload({ config });
const { samples, skippedDrafts, stats } = await copyInfoTextToFacts(payload, { kind, write });

console.log(`[infoText] ${write ? "written" : "dry run (pass --write)"}, kind ${kind}`, stats);
if (skippedDrafts.length)
  console.log(
    `[infoText] skipped, newer draft (publish or discard it first): ${skippedDrafts.join(", ")}`,
  );
console.log(`[infoText] samples:\n${samples.join("\n")}`);
process.exit(stats.failed > 0 ? 1 : 0);
