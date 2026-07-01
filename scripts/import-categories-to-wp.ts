#!/usr/bin/env node
/**
 * Imports word categories from data/word-categories.json into WordPress
 * as terms in the berlinerisch_word_themen taxonomy via WP REST API.
 *
 * Prerequisites:
 *   - Phase 0 complete: berlinerisch_word_themen taxonomy registered in WP
 *   - data/word-categories.json exists (run categorize-words.ts first)
 *   - WP post type REST base confirmed (see POST_TYPE_REST_BASE constant below)
 *
 * Usage:
 *   infisical run -- pnpm tsx scripts/import-categories-to-wp.ts             # full import
 *   infisical run -- pnpm tsx scripts/import-categories-to-wp.ts --dry-run   # preview
 *   infisical run -- pnpm tsx scripts/import-categories-to-wp.ts --slug wat  # single word
 *
 * Requires env vars: WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { wpFetch, delay, getWpConfig, type WpConfig } from "./lib/wp-rest.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes("--dry-run");
const SLUG_FILTER = (() => {
  const idx = process.argv.indexOf("--slug");
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
})();

// ── VERIFY THIS against your register_post_type() rest_base value ──────────
// Run: curl -s "${WP_REST_API}/wp/v2/" | grep -i berliner
// to list available endpoints and find the correct post type REST base.
const POST_TYPE_REST_BASE = "berlinerisch";

// Taxonomy rest_base from register_taxonomy() call (rest_base: 'berlinerisch-themen')
const TAXONOMY_REST_BASE = "berlinerisch-themen";

const RATE_MS = 150;

// ── Category labels (for creating terms) ──────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  "essen-trinken": "Essen & Trinken",
  "alkohol-kneipe": "Alkohol & Kneipe",
  "schimpfwoerter-beleidigungen": "Schimpfwörter & Beleidigungen",
  "charakter-eigenschaften": "Charakter & Eigenschaften",
  "gefuehle-emotionen": "Gefühle & Emotionen",
  "koerper": "Körper",
  "geld": "Geld",
  "orte-spitzname": "Berliner Orte & Spitznamen",
  "stadtleben": "Berliner Stadtleben",
  "beziehungen-soziales": "Beziehungen & Soziales",
  "alltag-wohnen": "Alltag & Wohnen",
  "unterhaltung-freizeit": "Unterhaltung & Freizeit",
};

// ── Types ──────────────────────────────────────────────────────────────────
interface WordCategory {
  berlinerWordId: number;
  slug: string;
  berlinerisch: string;
  translations: string[];
  themen: string[];
}

interface WpTerm {
  id: number;
  slug: string;
  name: string;
}

interface WpPost {
  id: number;
  slug: string;
  link?: string;
}

// ── Term management ────────────────────────────────────────────────────────
async function getOrCreateTerm(slug: string, config: WpConfig): Promise<WpTerm> {
  const existing = await wpFetch<WpTerm[]>(
    `/${TAXONOMY_REST_BASE}?slug=${encodeURIComponent(slug)}&per_page=1`,
    {},
    config,
  );

  if (existing.length > 0) {
    console.log(`  Term exists: "${slug}" (id=${existing[0].id})`);
    return existing[0];
  }

  const name = CATEGORY_LABELS[slug] ?? slug;
  console.log(`  Creating term: "${slug}" → "${name}"`);

  if (DRY_RUN) {
    return { id: -1, slug, name };
  }

  const created = await wpFetch<WpTerm>(
    `/${TAXONOMY_REST_BASE}`,
    { method: "POST", body: JSON.stringify({ name, slug }) },
    config,
  );

  await delay(RATE_MS);
  return created;
}

// ── Fetch all WP posts (slug → id map) ────────────────────────────────────
async function fetchAllPostSlugs(config: WpConfig): Promise<Map<string, number>> {
  const slugMap = new Map<string, number>();
  let page = 1;
  let total = 0;

  while (true) {
    const posts = await wpFetch<WpPost[]>(
      `/${POST_TYPE_REST_BASE}?per_page=100&page=${page}&_fields=id,slug&status=publish`,
      {},
      config,
    );

    if (posts.length === 0) break;

    for (const post of posts) {
      slugMap.set(post.slug, post.id);
    }

    total += posts.length;
    process.stdout.write(`\rFetched ${total} WP posts...`);

    if (posts.length < 100) break;
    page++;
    await delay(RATE_MS);
  }

  process.stdout.write("\n");
  return slugMap;
}

// ── Assign terms to a post ─────────────────────────────────────────────────
async function assignTermsToPost(
  postId: number,
  termIds: number[],
  config: WpConfig,
): Promise<void> {
  if (DRY_RUN) return;

  await wpFetch(
    `/${POST_TYPE_REST_BASE}/${postId}`,
    {
      method: "POST",
      body: JSON.stringify({ [TAXONOMY_REST_BASE]: termIds }),
    },
    config,
  );

  await delay(RATE_MS);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}${SLUG_FILTER ? ` | slug="${SLUG_FILTER}"` : ""}`);

  const dataPath = join(__dirname, "../data/word-categories.json");
  let words: WordCategory[] = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${words.length} words from ${dataPath}`);

  if (SLUG_FILTER) {
    words = words.filter((w) => w.slug === SLUG_FILTER);
    if (words.length === 0) {
      console.error(`No word found with slug "${SLUG_FILTER}"`);
      process.exit(1);
    }
    console.log(`Filtered to ${words.length} word(s) matching slug "${SLUG_FILTER}"`);
  }

  const config = getWpConfig();

  // Step 1: Collect unique theme slugs
  const allThemeSlugs = [...new Set(words.flatMap((w) => w.themen))].sort();
  console.log(`\nUnique themes (${allThemeSlugs.length}): ${allThemeSlugs.join(", ")}`);

  // Step 2: Create / verify all taxonomy terms
  console.log("\n--- Step 1: Ensuring taxonomy terms exist ---");
  const termIdMap = new Map<string, number>();

  for (const slug of allThemeSlugs) {
    const term = await getOrCreateTerm(slug, config);
    termIdMap.set(slug, term.id);
    await delay(RATE_MS);
  }

  // Step 3: Fetch all WP post IDs (slug → id)
  console.log("\n--- Step 2: Fetching all WP post slugs ---");
  const postSlugMap = await fetchAllPostSlugs(config);
  console.log(`Found ${postSlugMap.size} published posts`);

  // Step 4: Assign terms
  console.log(`\n--- Step 3: Assigning terms to ${words.length} posts ---`);
  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const word of words) {
    const termIds = word.themen
      .map((s) => termIdMap.get(s))
      .filter((id): id is number => typeof id === "number" && id !== -1);

    if (termIds.length === 0) {
      console.warn(`  SKIP ${word.slug}: no valid term IDs (themen=${word.themen.join(",")})`);
      skipped++;
      continue;
    }

    const postId = postSlugMap.get(word.slug);
    if (!postId) {
      console.warn(`  SKIP ${word.slug}: post not found in WP REST (wrong POST_TYPE_REST_BASE?)`);
      skipped++;
      continue;
    }

    try {
      await assignTermsToPost(postId, termIds, config);
      console.log(
        `  ${DRY_RUN ? "[dry]" : "✓"} ${word.berlinerisch} (${word.slug}) → [${word.themen.join(", ")}]`,
      );
      success++;
    } catch (err) {
      console.error(`  ✗ ${word.slug} (id=${postId}): ${err}`);
      errors++;
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✓ Assigned: ${success}`);
  if (skipped > 0) console.log(`⚠ Skipped:  ${skipped}`);
  if (errors > 0) console.log(`✗ Errors:   ${errors}`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
