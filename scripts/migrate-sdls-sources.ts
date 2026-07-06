#!/usr/bin/env node
/**
 * Migrates the SDLS source note out of `info_text` into the `sources`
 * checkbox on existing `berlinerisch` posts.
 *
 * Finds posts whose ACF info_text contains
 * "SDLS/Schlobi’s Linguistic Corner – Berlinisch: Lexikon", removes the
 * "Quelle: …" line (including surrounding blank lines) and adds the value
 * as a sources > source checkbox entry instead (skipped if already set).
 *
 * Idempotent: posts whose info_text no longer contains the marker are
 * never touched, and the sources entry is only added once.
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/migrate-sdls-sources.ts --dry-run    # preview
 *   infisical run -- pnpm dlx tsx scripts/migrate-sdls-sources.ts              # migrate all
 *   infisical run -- pnpm dlx tsx scripts/migrate-sdls-sources.ts --limit 5    # first 5 only
 *   infisical run -- pnpm dlx tsx scripts/migrate-sdls-sources.ts --slug dampf # single post
 *
 * Requires env vars: WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { wpFetch, delay, getWpConfig, type WpConfig } from "./lib/wp-rest.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  return idx !== -1 ? Number(process.argv[idx + 1]) : Infinity;
})();
const SLUG_FILTER = (() => {
  const idx = process.argv.indexOf("--slug");
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
})();

const POST_TYPE_REST_BASE = "berlinerisch";
const RATE_MS = 150;
const PER_PAGE = 100;

// Exact ACF checkbox choice value (note the U+2019 apostrophe and en dash).
const SOURCE_VALUE = "SDLS/Schlobi’s Linguistic Corner – Berlinisch: Lexikon";

// Matches the SDLS note in info_text incl. leading blank lines / trailing
// whitespace and an optional <p> wrapper from the wysiwyg field. The
// "Quelle:" prefix is optional and apostrophe/dash tolerate the ASCII
// variants ('/-) that some imported posts contain.
const QUELLE_LINE_RE =
  /(?:\s|<p>)*(?:Quelle:\s*)?SDLS\/Schlobi[’']s Linguistic Corner [–-] Berlinisch: Lexikon(?:\s|<\/p>)*/g;

interface SourcesRow {
  source: string[];
}

interface WpPost {
  id: number;
  slug: string;
  status: string;
  acf?: {
    berlinerisch?: string;
    info_text?: string;
    sources?: SourcesRow[] | null;
  };
}

async function fetchAllPosts(config: WpConfig): Promise<WpPost[]> {
  const posts: WpPost[] = [];
  for (let page = 1; ; page++) {
    const batch = await wpFetch<WpPost[]>(
      `/${POST_TYPE_REST_BASE}?per_page=${PER_PAGE}&page=${page}&status=publish,draft&_fields=id,slug,status,acf.berlinerisch,acf.info_text,acf.sources`,
      {},
      config,
    );
    posts.push(...batch);
    process.stdout.write(`\rFetched ${posts.length} posts (page ${page})...`);
    if (batch.length < PER_PAGE) break;
    await delay(RATE_MS);
  }
  console.log();
  return posts;
}

function hasSourceValue(sources: SourcesRow[] | null | undefined): boolean {
  return (sources ?? []).some((row) => (row.source ?? []).includes(SOURCE_VALUE));
}

async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  const config = getWpConfig();

  const posts = await fetchAllPosts(config);
  // .match() instead of .test() — the latter is stateful with the g flag.
  let candidates = posts.filter((p) => (p.acf?.info_text ?? "").match(QUELLE_LINE_RE));
  if (SLUG_FILTER) candidates = candidates.filter((p) => p.slug === SLUG_FILTER);
  candidates = candidates.slice(0, LIMIT);
  console.log(`Found ${candidates.length} posts with the SDLS note in info_text\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of candidates) {
    const infoText = post.acf?.info_text ?? "";
    const newInfoText = infoText.replace(QUELLE_LINE_RE, "\n").trim();

    if (newInfoText.includes("SDLS")) {
      // Marker present outside the expected "Quelle: …" line — needs a human.
      console.log(`  ⚠ SKIP ${post.slug} (#${post.id}): unexpected info_text format, review manually`);
      skipped++;
      continue;
    }

    const sources: SourcesRow[] = [...(post.acf?.sources ?? [])];
    const alreadyInSources = hasSourceValue(sources);
    if (!alreadyInSources) sources.push({ source: [SOURCE_VALUE] });

    console.log(
      `  ${DRY_RUN ? "[dry] " : ""}${post.slug} (#${post.id}, ${post.status}): ` +
        `info_text ${infoText.length}→${newInfoText.length} chars` +
        `${alreadyInSources ? ", source already set" : ", + source entry"}`,
    );

    if (DRY_RUN) {
      updated++;
      continue;
    }

    try {
      const result = await wpFetch<WpPost>(
        `/${POST_TYPE_REST_BASE}/${post.id}?_fields=id,acf.info_text,acf.sources`,
        {
          method: "POST",
          // ACF REST validation requires the mandatory `berlinerisch` field
          // in every acf update payload — send it back unchanged.
          body: JSON.stringify({
            acf: { berlinerisch: post.acf?.berlinerisch, info_text: newInfoText, sources },
          }),
        },
        config,
      );

      const savedInfo = result.acf?.info_text ?? "";
      if (savedInfo.includes("SDLS") || !hasSourceValue(result.acf?.sources)) {
        console.log(`  ✗ VERIFY FAILED ${post.slug}: response not as expected, check post manually`);
        failed++;
      } else {
        updated++;
      }
    } catch (e) {
      console.log(`  ✗ FAILED ${post.slug}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }

    await delay(RATE_MS);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`✓ Updated: ${updated}${DRY_RUN ? " (dry run)" : ""}`);
  if (skipped) console.log(`⚠ Skipped (manual review): ${skipped}`);
  if (failed) console.log(`✗ Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
