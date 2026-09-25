#!/usr/bin/env node
/**
 * Parses data/lexikon-import/supplement-suggestions-meyer.md and appends
 * Meyer-1904 supplement text onto the matching already-live WordPress post —
 * never overwrites existing examples/infoText, only adds.
 *
 * Bullets that quote an actual Berlin phrase ("- **Wort** — „Zitat" =
 * Bedeutung.") become a new `examples` row (quote + explanation). Bullets
 * that are a bare gloss with no quote ("- **Wort** — Bedeutung.") aren't a
 * usage example, so they're appended as a paragraph to `infoText` instead.
 *
 * Only touches "safe" bullets — lines with no duplicate-post or ⚠ marker.
 * Bullets containing "abgleichen" (a duplicate post was already created for
 * this collision — needs a manual merge decision) or "⚠" (explicitly
 * flagged for human judgement in the source doc) are left untouched and
 * reported separately.
 *
 * Idempotent: skips a bullet if the post already has this exact text
 * (re-running after a partial/failed run is safe).
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/append-meyer-supplements.ts --dry-run
 *   infisical run -- pnpm dlx tsx scripts/append-meyer-supplements.ts
 *   infisical run -- pnpm dlx tsx scripts/append-meyer-supplements.ts --word Abkratzen
 *
 * Requires env vars: WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { wpFetch, delay, getWpConfig, fetchAllPosts, type WpConfig } from "./lib/wp-rest.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MD_PATH = join(__dirname, "../data/lexikon-import/supplement-suggestions-meyer.md");

const DRY_RUN = process.argv.includes("--dry-run");
const WORD_FILTER = (() => {
  const idx = process.argv.indexOf("--word");
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
})();

const POST_TYPE_REST_BASE = "berlinerisch";
const RATE_MS = 150;

const ACF = {
  example: "example",
  exampleExplanation: "example_explanation",
  examples: "examples",
  infoText: "info_text",
  source: "source",
  sources: "sources",
} as const;

const MEYER_QUELLE = "Der richtige Berliner in Wörtern und Redensarten / Meyer, Hans";

// ── Parse markdown bullets ──────────────────────────────────────────────────
interface SupplementEntry {
  words: string[]; // headword, or several via "Been/Bein" style alt spellings
  body: string;
  flag: "safe" | "duplicate" | "warning";
}

const BULLET_RE = /^- \*\*(.+?)\*\*(?:\s*\([^)]*\))?\s*—\s*(.+)$/;

function parseMarkdown(md: string): SupplementEntry[] {
  const entries: SupplementEntry[] = [];
  for (const line of md.split("\n")) {
    const m = BULLET_RE.exec(line.trim());
    if (!m) continue;
    const [, headword, body] = m;
    const words = headword.split("/").map((w) => w.trim());
    const flag: SupplementEntry["flag"] = body.includes("⚠")
      ? "warning"
      : /abgleichen/.test(body)
        ? "duplicate"
        : "safe";
    entries.push({ body: body.trim(), flag, words });
  }
  return entries;
}

// ── Split body into example sentence + explanation, when possible ─────────
// Source doc uses opening „ but a straight closing quote, not „...“.
const QUOTE_RE = /„([^"]+)"/;

// A bullet only becomes an `examples` row when it actually quotes a Berlin
// phrase — a bare gloss ("Abkratzen — sterben.") isn't a usage example, it's
// a supplementary meaning nuance, so it goes to `infoText` instead.
function toExample(body: string): { example: string; exampleExplanation?: string } | null {
  const quoted = QUOTE_RE.exec(body);
  if (!quoted) return null;
  const rest = body
    .replace(quoted[0], "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[—=:.,]\s*/, "")
    .trim();
  return { example: quoted[1], ...(rest ? { exampleExplanation: rest } : {}) };
}

// ── WP: fetch all posts with title + acf (examples, sources) ──────────────
interface WpExample {
  [ACF.example]: string;
  [ACF.exampleExplanation]?: string;
}

interface WpPost {
  id: number;
  title?: { rendered: string };
  acf?: {
    examples?: WpExample[];
    infoText?: string;
    sources?: Array<{ source?: string[] }>;
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function fetchAllPostsByTitle(config: WpConfig): Promise<Map<string, WpPost>> {
  const posts = await fetchAllPosts<WpPost>(
    POST_TYPE_REST_BASE,
    "id,title,acf",
    config,
    RATE_MS,
    (count, page) => process.stdout.write(`\rFetched ${count} posts (page ${page})...`),
  );
  process.stdout.write("\n");

  const map = new Map<string, WpPost>();
  for (const post of posts) {
    if (post.title?.rendered) {
      map.set(decodeEntities(post.title.rendered).trim().toLowerCase(), post);
    }
  }
  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}${WORD_FILTER ? ` | word="${WORD_FILTER}"` : ""}`);

  let entries = parseMarkdown(readFileSync(MD_PATH, "utf-8"));
  console.log(`Parsed ${entries.length} bullet entries from supplement-suggestions-meyer.md`);

  const duplicateCount = entries.filter((e) => e.flag === "duplicate").length;
  const warningCount = entries.filter((e) => e.flag === "warning").length;
  console.log(
    `  safe=${entries.length - duplicateCount - warningCount} duplicate=${duplicateCount} warning=${warningCount} (duplicate/warning are never auto-written)`,
  );

  entries = entries.filter((e) => e.flag === "safe");
  if (WORD_FILTER) {
    entries = entries.filter((e) => e.words.some((w) => w.toLowerCase() === WORD_FILTER.toLowerCase()));
    console.log(`Filtered to ${entries.length} safe entr(y/ies) matching "${WORD_FILTER}"`);
  }

  const config = getWpConfig();
  console.log("\n--- Fetching all WP posts (title + acf) ---");
  const postsByTitle = await fetchAllPostsByTitle(config);

  let appendedExample = 0;
  let appendedInfoText = 0;
  let skippedNoMatch = 0;
  let skippedAlready = 0;
  let errors = 0;
  const unmatched: string[] = [];

  for (const entry of entries) {
    const post = entry.words.map((w) => postsByTitle.get(w.toLowerCase())).find(Boolean);
    if (!post) {
      skippedNoMatch++;
      unmatched.push(entry.words.join("/"));
      continue;
    }

    const parsed = toExample(entry.body);
    const acfPatch: Record<string, unknown> = {};
    let logLine: string;

    if (parsed) {
      const existingExamples = post.acf?.examples ?? [];
      if (existingExamples.some((e) => e[ACF.example] === parsed.example)) {
        skippedAlready++;
        continue;
      }
      acfPatch[ACF.examples] = [
        ...existingExamples,
        {
          [ACF.example]: parsed.example,
          ...(parsed.exampleExplanation ? { [ACF.exampleExplanation]: parsed.exampleExplanation } : {}),
        },
      ];
      logLine = `+example="${parsed.example}"${parsed.exampleExplanation ? ` / "${parsed.exampleExplanation}"` : ""}`;
    } else {
      const existingInfoText = post.acf?.infoText ?? "";
      if (existingInfoText.includes(entry.body)) {
        skippedAlready++;
        continue;
      }
      const addition = `<p>Meyer (1904): ${entry.body}</p>`;
      acfPatch[ACF.infoText] = existingInfoText ? `${existingInfoText}\n${addition}` : addition;
      logLine = `+infoText="${entry.body}"`;
    }

    const existingSources = post.acf?.sources ?? [];
    const hasMeyerSource = existingSources.some((s) => s.source?.includes(MEYER_QUELLE));
    acfPatch[ACF.sources] = hasMeyerSource
      ? existingSources
      : existingSources.length > 0
        ? [
            { ...existingSources[0], source: [...(existingSources[0].source ?? []), MEYER_QUELLE] },
            ...existingSources.slice(1),
          ]
        : [{ source: [MEYER_QUELLE] }];

    if (DRY_RUN) {
      console.log(`  [dry] ${entry.words.join("/")} (id=${post.id}) ${logLine}`);
      if (parsed) appendedExample++;
      else appendedInfoText++;
      continue;
    }

    try {
      await wpFetch(
        `/${POST_TYPE_REST_BASE}/${post.id}`,
        { body: JSON.stringify({ acf: acfPatch }), method: "POST" },
        config,
      );
      console.log(`  ✓ ${entry.words.join("/")} (id=${post.id}) ${logLine}`);
      if (parsed) appendedExample++;
      else appendedInfoText++;
      await delay(RATE_MS);
    } catch (err) {
      console.error(`  ✗ ${entry.words.join("/")}: ${err}`);
      errors++;
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✓ Appended as example: ${appendedExample}${DRY_RUN ? " (dry run)" : ""}`);
  console.log(`✓ Appended as infoText: ${appendedInfoText}${DRY_RUN ? " (dry run)" : ""}`);
  console.log(`→ Skipped (already present): ${skippedAlready}`);
  console.log(`→ Skipped (no matching WP post — still pending import): ${skippedNoMatch}`);
  if (unmatched.length > 0 && unmatched.length <= 60) {
    console.log(`  Unmatched: ${unmatched.join(", ")}`);
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
