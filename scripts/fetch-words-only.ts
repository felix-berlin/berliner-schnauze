/**
 * Fetches all words from WP GraphQL and saves to data/words-raw.json.
 * Used when categorizing manually (no ANTHROPIC_API_KEY needed).
 *
 * Usage: infisical run -- pnpm exec tsx scripts/fetch-words-only.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../data/words-raw.json");

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
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  const WP_API = process.env["WP_API"];
  if (!WP_API) throw new Error("WP_API env var missing");

  const words = [];
  let after = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await fetch(WP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: GQL_QUERY, variables: { first: 100, after } }),
    });

    const json = await res.json() as any;
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const result = json.data.berlinerWords;
    words.push(...result.edges.map((e: any) => e.node));
    hasNextPage = result.pageInfo.hasNextPage;
    after = result.pageInfo.endCursor ?? null;
    process.stdout.write(`\rFetched ${words.length} words...`);
  }

  process.stdout.write("\n");
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(words, null, 2));
  console.log(`Saved ${words.length} words → ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
