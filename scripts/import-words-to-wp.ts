#!/usr/bin/env node
/**
 * Imports new Berliner words from data/lexikon-import/words-*.json into
 * WordPress as `berlinerisch` posts (ACF WordProperties + themen taxonomy)
 * via WP REST API.
 *
 * Idempotent: fetches all existing post slugs first and skips words that
 * already exist (any status) — safe to re-run and safe against words that
 * were already imported manually.
 *
 * Prerequisites:
 *   - ACF field group "WordProperties" has "Show in REST API" enabled
 *     (otherwise the `acf` key in the POST body is silently ignored — the
 *     script verifies the response and reports this).
 *   - berlinerisch_word_themen taxonomy registered (rest_base: berlinerisch-themen)
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/import-words-to-wp.ts --dry-run     # preview
 *   infisical run -- pnpm dlx tsx scripts/import-words-to-wp.ts               # import as drafts
 *   infisical run -- pnpm dlx tsx scripts/import-words-to-wp.ts --publish     # import published
 *   infisical run -- pnpm dlx tsx scripts/import-words-to-wp.ts --limit 5     # first 5 only
 *   infisical run -- pnpm dlx tsx scripts/import-words-to-wp.ts --word Deez   # single word
 *
 * Requires env vars: WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { wpFetch, delay, getWpConfig, type WpConfig } from "./lib/wp-rest.ts";
import { CATEGORY_LABELS, CATEGORIES } from "./lib/word-category.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/lexikon-import");

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISH = process.argv.includes("--publish");
const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  return idx !== -1 ? Number(process.argv[idx + 1]) : Infinity;
})();
const WORD_FILTER = (() => {
  const idx = process.argv.indexOf("--word");
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
})();

const POST_TYPE_REST_BASE = "berlinerisch";
const TAXONOMY_REST_BASE = "berlinerisch-themen";
const RATE_MS = 150;
const DRY_RUN_TERM_ID = -1;

// ── VERIFY these ACF field names against the WordProperties field group ────
// (GraphQL exposes them camelCased; REST uses the raw ACF field names.)
// Check one existing post: curl -u "$WP_AUTH_USER:$WP_AUTH_PASS" \
//   "$WP_REST_API/wp/v2/berlinerisch?per_page=1" | jq '.[0].acf'
const ACF = {
  berlinerisch: "berlinerisch",
  article: "article",
  translations: "translations",
  translation: "translation",
  examples: "examples",
  example: "example",
  exampleExplanation: "example_explanation",
  alternativeWords: "alternative_words",
  alternativeWord: "alternative_word",
  infoText: "info_text",
  sources: "sources",
  source: "source",
} as const;

// Value for the sources > source checkbox on every imported word.
// Verified against the live ACF checkbox choice (post "dampf") — note the
// U+2019 apostrophe and en dash; the value must match byte-for-byte.
const SOURCE_QUELLE = "SDLS/Schlobi’s Linguistic Corner – Berlinisch: Lexikon";

// ── Types ──────────────────────────────────────────────────────────────────
export interface LexikonExample {
  example: string;
  explanation?: string;
}

export interface LexikonEntry {
  /** Post title + wordProperties.berlinerisch */
  word: string;
  /** der/die/das — only for nouns where unambiguous */
  article?: string;
  /** Short High German equivalents (one per repeater row) */
  translations: string[];
  examples?: LexikonExample[];
  /** Spelling variants (e.g. abjachtern for abjachern) */
  alternativeWords?: string[];
  /** Etymology / background, plain text or minimal HTML (wysiwyg field) */
  infoText?: string;
  /** berlinerisch-themen term slugs */
  themen: string[];
  /**
   * Set when the entry intentionally collides case-insensitively with another
   * word (e.g. verb "fetzen" vs noun "Fetzen") — disables the case-insensitive
   * duplicate guard; the exact-title guard still applies.
   */
  allowDuplicate?: boolean;
}

interface WpTerm {
  id: number;
  slug: string;
  name: string;
}

interface WpPost {
  id: number;
  slug: string;
  title?: { rendered: string };
  link?: string;
  acf?: Record<string, unknown>;
}

const VALID_THEMEN = new Set<string>(CATEGORIES.map((c) => c.slug));

// ── Slug handling (WP de_DE sanitize_title transliteration) ────────────────
export function slugify(word: string): string {
  return word
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Load entries ───────────────────────────────────────────────────────────
function loadEntries(): LexikonEntry[] {
  const files = readdirSync(DATA_DIR)
    .filter((f) => /^words-.*\.json$/.test(f))
    .sort();

  if (files.length === 0) {
    throw new Error(`No words-*.json files found in ${DATA_DIR}`);
  }

  const entries: LexikonEntry[] = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8")) as LexikonEntry[];
    console.log(`Loaded ${parsed.length} entries from ${file}`);
    entries.push(...parsed);
  }
  return entries;
}

// ── Term management ────────────────────────────────────────────────────────
async function getOrCreateTerm(slug: string, config: WpConfig): Promise<WpTerm> {
  const existing = await wpFetch<WpTerm[]>(
    `/${TAXONOMY_REST_BASE}?slug=${encodeURIComponent(slug)}&per_page=1`,
    {},
    config,
  );
  if (existing.length > 0) return existing[0];

  const name = CATEGORY_LABELS[slug] ?? slug;
  console.log(`  Creating term: "${slug}" → "${name}"`);
  if (DRY_RUN) return { id: DRY_RUN_TERM_ID, slug, name };

  const created = await wpFetch<WpTerm>(
    `/${TAXONOMY_REST_BASE}`,
    { method: "POST", body: JSON.stringify({ name, slug }) },
    config,
  );
  await delay(RATE_MS);
  return created;
}

// ── Fetch existing post titles (all statuses we can see) ──────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function fetchExistingTitles(config: WpConfig): Promise<Set<string>> {
  const titles = new Set<string>();
  for (const status of ["publish", "draft", "pending", "future", "private"]) {
    let page = 1;
    while (true) {
      let posts: WpPost[];
      try {
        posts = await wpFetch<WpPost[]>(
          `/${POST_TYPE_REST_BASE}?per_page=100&page=${page}&_fields=id,title&status=${status}`,
          {},
          config,
        );
      } catch (err) {
        // Some statuses 400 when empty/unauthorized — publish must work though
        if (status === "publish") throw err;
        break;
      }
      if (posts.length === 0) break;
      for (const post of posts) {
        if (post.title?.rendered) titles.add(decodeEntities(post.title.rendered).trim());
      }
      process.stdout.write(`\rFetched ${titles.size} existing titles (${status}, page ${page})...`);
      if (posts.length < 100) break;
      page++;
      await delay(RATE_MS);
    }
  }
  process.stdout.write("\n");
  return titles;
}

// ── Build POST body ────────────────────────────────────────────────────────
function buildPostBody(entry: LexikonEntry, termIds: number[]): Record<string, unknown> {
  const acf: Record<string, unknown> = {
    [ACF.berlinerisch]: entry.word,
    [ACF.translations]: entry.translations.map((t) => ({ [ACF.translation]: t })),
  };
  if (entry.article) acf[ACF.article] = entry.article;
  if (entry.examples?.length) {
    acf[ACF.examples] = entry.examples.map((e) => ({
      [ACF.example]: e.example,
      ...(e.explanation ? { [ACF.exampleExplanation]: e.explanation } : {}),
    }));
  }
  if (entry.alternativeWords?.length) {
    acf[ACF.alternativeWords] = entry.alternativeWords.map((w) => ({
      [ACF.alternativeWord]: w,
    }));
  }
  if (entry.infoText) acf[ACF.infoText] = entry.infoText;
  acf[ACF.sources] = [{ [ACF.source]: [SOURCE_QUELLE] }];

  return {
    title: entry.word,
    status: PUBLISH ? "publish" : "draft",
    acf,
    ...(termIds.length > 0 ? { [TAXONOMY_REST_BASE]: termIds } : {}),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | status=${PUBLISH ? "publish" : "draft"}${
      WORD_FILTER ? ` | word="${WORD_FILTER}"` : ""
    }${Number.isFinite(LIMIT) ? ` | limit=${LIMIT}` : ""}`,
  );

  let entries = loadEntries();
  console.log(`Total: ${entries.length} entries`);

  // Validate before touching WP
  const seenExact = new Set<string>();
  const seenLower = new Set<string>();
  const problems: string[] = [];
  for (const e of entries) {
    if (!e.word?.trim()) problems.push(`Entry without word: ${JSON.stringify(e)}`);
    if (!e.translations?.length) problems.push(`"${e.word}": no translations`);
    if (seenExact.has(e.word)) problems.push(`Duplicate word in data: "${e.word}"`);
    if (seenLower.has(e.word.toLowerCase()) && !e.allowDuplicate) {
      problems.push(`Case-insensitive duplicate: "${e.word}" (set allowDuplicate if intended)`);
    }
    seenExact.add(e.word);
    seenLower.add(e.word.toLowerCase());
    for (const t of e.themen ?? []) {
      if (!VALID_THEMEN.has(t)) problems.push(`"${e.word}": unknown thema "${t}"`);
    }
  }
  if (problems.length > 0) {
    console.error(`\n✗ ${problems.length} data problems:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }

  if (WORD_FILTER) {
    entries = entries.filter((e) => e.word === WORD_FILTER);
    if (entries.length === 0) {
      console.error(`No entry found for word "${WORD_FILTER}"`);
      process.exit(1);
    }
  }

  const config = getWpConfig();

  console.log("\n--- Step 1: Ensuring taxonomy terms exist ---");
  const allThemeSlugs = [...new Set(entries.flatMap((e) => e.themen))].sort();
  const termIdMap = new Map<string, number>();
  for (const slug of allThemeSlugs) {
    const term = await getOrCreateTerm(slug, config);
    termIdMap.set(slug, term.id);
  }

  console.log("\n--- Step 2: Fetching existing post titles ---");
  const existingTitles = await fetchExistingTitles(config);
  const existingLower = new Set([...existingTitles].map((t) => t.toLowerCase()));
  console.log(`Found ${existingTitles.size} existing posts`);

  console.log(`\n--- Step 3: Creating posts ---`);
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let acfWarned = false;
  // Skipped entries incl. their full lexikon data, persisted for a later
  // pass that checks whether the existing WP posts can be enriched.
  const skippedEntries: Array<LexikonEntry & { skipReason: string }> = [];

  for (const entry of entries) {
    if (created >= LIMIT) break;

    if (existingTitles.has(entry.word)) {
      console.log(`  SKIP (exists): ${entry.word}`);
      skippedEntries.push({ ...entry, skipReason: "exists" });
      skipped++;
      continue;
    }
    if (existingLower.has(entry.word.toLowerCase()) && !entry.allowDuplicate) {
      console.log(`  SKIP (case-variant exists): ${entry.word}`);
      skippedEntries.push({ ...entry, skipReason: "case-variant-exists" });
      skipped++;
      continue;
    }

    const termIds = entry.themen
      .map((s) => termIdMap.get(s))
      .filter((id): id is number => typeof id === "number" && id !== DRY_RUN_TERM_ID);
    const body = buildPostBody(entry, termIds);

    if (DRY_RUN) {
      console.log(
        `  [dry] ${entry.word} → translations=[${entry.translations.join("; ")}] themen=[${entry.themen.join(", ")}] examples=${entry.examples?.length ?? 0}`,
      );
      created++;
      continue;
    }

    try {
      const post = await wpFetch<WpPost>(
        `/${POST_TYPE_REST_BASE}`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      );

      // Verify ACF actually landed (detects missing "Show in REST API")
      if (!acfWarned && (!post.acf || !post.acf[ACF.berlinerisch])) {
        console.warn(
          `  ⚠ WP response has no populated "acf" — enable "Show in REST API" on the WordProperties field group, then re-run (existing posts are skipped, so delete "${entry.word}" first).`,
        );
        acfWarned = true;
      }

      console.log(`  ✓ ${entry.word} (id=${post.id}, ${body.status as string})`);
      existingTitles.add(entry.word);
      existingLower.add(entry.word.toLowerCase());
      created++;
      await delay(RATE_MS);
    } catch (err) {
      console.error(`  ✗ ${entry.word}: ${err}`);
      errors++;
      if (errors >= 5 && created === 0) {
        console.error("Aborting: first 5 requests all failed — check config/auth.");
        process.exit(1);
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✓ Created: ${created}${DRY_RUN ? " (dry run)" : ""}`);
  console.log(`→ Skipped (already exist): ${skipped}`);
  if (skippedEntries.length > 0) {
    const skipFile = join(DATA_DIR, "skipped-words.json");
    writeFileSync(skipFile, JSON.stringify(skippedEntries, null, 2) + "\n");
    console.log(`→ Skipped entries written to ${skipFile}`);
  }
  if (errors > 0) {
    console.log(`✗ Errors: ${errors}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
