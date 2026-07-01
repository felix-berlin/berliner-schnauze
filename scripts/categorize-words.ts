#!/usr/bin/env node
/**
 * Fetches all Berliner Schnauze words from WordPress GraphQL and categorizes
 * them using Claude AI. Saves results to data/word-categories.json.
 *
 * Usage:
 *   infisical run -- pnpm tsx scripts/categorize-words.ts            # full run
 *   infisical run -- pnpm tsx scripts/categorize-words.ts --dry-run  # preview only
 *
 * Requires env vars: WP_API, ANTHROPIC_API_KEY
 * Resume-safe: skips already-categorized words on re-run.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes("--dry-run");
const OUTPUT_PATH = join(__dirname, "../data/word-categories.json");
const BATCH_SIZE = 50;

// ── Category taxonomy ──────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: "essen-trinken", label: "Essen & Trinken" },
  { slug: "alkohol-kneipe", label: "Alkohol & Kneipe" },
  { slug: "schimpfwoerter-beleidigungen", label: "Schimpfwörter & Beleidigungen" },
  { slug: "charakter-eigenschaften", label: "Charakter & Eigenschaften" },
  { slug: "gefuehle-emotionen", label: "Gefühle & Emotionen" },
  { slug: "koerper", label: "Körper" },
  { slug: "geld", label: "Geld" },
  { slug: "orte-spitzname", label: "Berliner Orte & Spitznamen" },
  { slug: "stadtleben", label: "Berliner Stadtleben" },
  { slug: "beziehungen-soziales", label: "Beziehungen & Soziales" },
  { slug: "alltag-wohnen", label: "Alltag & Wohnen" },
  { slug: "unterhaltung-freizeit", label: "Unterhaltung & Freizeit" },
] as const;

const ALLOWED_SLUGS: Set<string> = new Set(CATEGORIES.map((c) => c.slug));

// ── GraphQL query (minimal fields for categorization) ──────────────────────
const GQL_QUERY = `
  query GetWordsForCategorization($first: Int = 100, $after: String) {
    berlinerWords(
      first: $first
      after: $after
      where: { orderby: [{ field: TITLE, order: ASC }], stati: PUBLISH }
    ) {
      edges {
        node {
          berlinerWordId
          slug
          wordProperties {
            berlinerisch
            translations { translation }
            examples { example }
            infoText
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────
interface WordNode {
  berlinerWordId: number;
  slug: string | null;
  wordProperties: {
    berlinerisch: string | null;
    translations: Array<{ translation: string | null } | null> | null;
    examples: Array<{ example: string | null } | null> | null;
    infoText: string | null;
  } | null;
}

export interface WordCategory {
  berlinerWordId: number;
  slug: string;
  berlinerisch: string;
  translations: string[];
  themen: string[];
}

// ── GQL fetch ──────────────────────────────────────────────────────────────
async function fetchAllWords(): Promise<WordNode[]> {
  const WP_API = process.env["WP_API"];
  if (!WP_API) throw new Error("WP_API env var missing");

  const words: WordNode[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(WP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: GQL_QUERY, variables: { first: 100, after } }),
    });

    if (!response.ok) throw new Error(`GQL fetch failed: ${response.status} ${response.statusText}`);

    const json = (await response.json()) as {
      data?: {
        berlinerWords: {
          edges: Array<{ node: WordNode }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(`GQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
    }

    const result = json.data!.berlinerWords;
    words.push(...result.edges.map((e) => e.node));
    hasNextPage = result.pageInfo.hasNextPage;
    after = result.pageInfo.endCursor ?? null;

    process.stdout.write(`\rFetched ${words.length} words...`);
  }

  process.stdout.write("\n");
  return words;
}

// ── Claude categorization ──────────────────────────────────────────────────
async function categorizeWithClaude(
  words: WordNode[],
  anthropic: Anthropic,
): Promise<Array<{ id: number; themen: string[] }>> {
  const input = words.map((w) => ({
    id: w.berlinerWordId,
    berlinerisch: w.wordProperties?.berlinerisch ?? "",
    translations: (w.wordProperties?.translations ?? [])
      .map((t) => t?.translation)
      .filter(Boolean),
    examples: (w.wordProperties?.examples ?? [])
      .map((e) => e?.example)
      .filter(Boolean)
      .slice(0, 2),
    ...(w.wordProperties?.infoText ? { infoText: w.wordProperties.infoText } : {}),
  }));

  const categoryList = CATEGORIES.map((c) => `- ${c.slug}: ${c.label}`).join("\n");

  const prompt = `Du bist ein Experte für Berliner Dialekt und Alltagssprache. Kategorisiere die folgenden Berliner Mundart-Wörter in eine oder mehrere der unten stehenden Themen-Kategorien.

Erlaubte Kategorien (nur diese Slugs verwenden):
${categoryList}

Regeln:
- Jedes Wort bekommt mindestens 1 Kategorie
- Maximal 3 Kategorien pro Wort
- Nur Slugs aus der obigen Liste verwenden
- Bei eindeutiger Zuordnung nur 1 Kategorie vergeben
- Alkohol-spezifische Wörter (Bier, Schnaps, Kneipe, betrunken sein) → alkohol-kneipe
- Berliner Spitznamen für Orte/Gebäude → orte-spitzname
- Kleidung und äußeres Erscheinungsbild → charakter-eigenschaften
- Kinder, Familie, Verwandtschaft → beziehungen-soziales

Wörter:
${JSON.stringify(input, null, 2)}

Antworte NUR mit validem JSON-Array (kein Markdown, keine Erklärungen):
[{"id": <berlinerWordId als Zahl>, "themen": ["slug1"]}]`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let parsed: Array<{ id: number; themen: string[] }>;
  try {
    // Strip potential markdown code fences
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON:\n${text.slice(0, 200)}`);
  }

  // Validate and sanitize slugs
  for (const item of parsed) {
    item.themen = item.themen.filter((s) => ALLOWED_SLUGS.has(s));
    if (item.themen.length === 0) {
      item.themen = ["alltag-wohnen"];
    }
  }

  return parsed;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  // Load existing results for resume support
  const existing = new Map<number, WordCategory>();
  if (existsSync(OUTPUT_PATH)) {
    const loaded = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8")) as WordCategory[];
    for (const item of loaded) existing.set(item.berlinerWordId, item);
    console.log(`Loaded ${existing.size} existing categorizations`);
  }

  console.log("Fetching words from WordPress GraphQL...");
  const words = await fetchAllWords();
  console.log(`Total words: ${words.length}`);

  const toProcess = words.filter(
    (w) => w.wordProperties?.berlinerisch && !existing.has(w.berlinerWordId),
  );
  console.log(`To categorize: ${toProcess.length} (skipping ${existing.size} already done)`);

  if (toProcess.length === 0) {
    console.log("All words already categorized. Run complete.");
    return;
  }

  if (DRY_RUN) {
    const preview = toProcess.slice(0, BATCH_SIZE).map((w) => ({
      id: w.berlinerWordId,
      slug: w.slug,
      berlinerisch: w.wordProperties?.berlinerisch,
      translations: (w.wordProperties?.translations ?? [])
        .map((t) => t?.translation)
        .filter(Boolean),
    }));
    console.log(`\n--- DRY RUN: first batch preview (${preview.length} words) ---`);
    console.log(JSON.stringify(preview, null, 2));
    console.log(`\nWould process ${Math.ceil(toProcess.length / BATCH_SIZE)} batches of ${BATCH_SIZE}`);
    return;
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY env var missing");
  const anthropic = new Anthropic({ apiKey });

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} words)...`);

    try {
      const results = await categorizeWithClaude(batch, anthropic);

      for (const result of results) {
        const word = batch.find((w) => w.berlinerWordId === result.id);
        if (!word) {
          console.warn(`  WARN: result id=${result.id} not found in batch`);
          continue;
        }

        existing.set(result.id, {
          berlinerWordId: result.id,
          slug: word.slug ?? "",
          berlinerisch: word.wordProperties?.berlinerisch ?? "",
          translations: (word.wordProperties?.translations ?? [])
            .map((t) => t?.translation)
            .filter((t): t is string => typeof t === "string"),
          themen: result.themen,
        });
      }

      // Save after every batch — crash recovery
      writeFileSync(OUTPUT_PATH, JSON.stringify([...existing.values()], null, 2));
      console.log(`  ✓ Batch ${batchNum}/${totalBatches} done — ${existing.size} total saved`);
    } catch (err) {
      console.error(`  ✗ Batch ${batchNum} failed:`, err);
      // Continue with next batch rather than aborting
    }
  }

  const output = [...existing.values()];
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n✓ Done. ${output.length} words categorized → ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
