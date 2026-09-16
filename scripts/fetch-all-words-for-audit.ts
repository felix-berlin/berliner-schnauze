#!/usr/bin/env node
/**
 * Fetches ALL berlinerisch words (publish + draft) via WPGraphQL with full
 * content (translations, infoText, berolinismus, current themen) and writes
 * them to data/lexikon-import/audit-themen-export.json for the themen audit.
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/fetch-all-words-for-audit.ts
 *
 * Requires env vars: WP_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../data/lexikon-import/audit-themen-export.json");

interface WpTermNode {
  name: string | null;
  slug: string | null;
}

interface WpWordNode {
  id: string;
  slug: string | null;
  title: string | null;
  status?: string;
  wordProperties: {
    berlinerisch: string | null;
    translations: { translation: string | null }[] | null;
    infoText: string | null;
    berolinismus: boolean | null;
    examples: { example: string | null; exampleExplanation: string | null }[] | null;
  };
  berlinerischThemen: { nodes: WpTermNode[] } | null;
}

const QUERY = `
  query AuditWords($after: String, $stati: [PostStatusEnum]) {
    berlinerWords(first: 100, after: $after, where: { stati: $stati, orderby: { field: TITLE, order: ASC } }) {
      edges {
        node {
          id
          slug
          title
          status
          wordProperties {
            berlinerisch
            translations { translation }
            infoText
            berolinismus
            examples { example exampleExplanation }
          }
          berlinerischThemen { nodes { name slug } }
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

async function fetchAll(): Promise<WpWordNode[]> {
  const wpApi = process.env.WP_API;
  const user = process.env.WP_AUTH_USER;
  const pass = process.env.WP_AUTH_PASS;
  if (!wpApi || !user || !pass) {
    throw new Error("Missing WP_API / WP_AUTH_USER / WP_AUTH_PASS env vars (run via `infisical run --`)");
  }
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");

  const all: WpWordNode[] = [];
  let after: string | null = null;

  while (true) {
    const res = await fetch(wpApi, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        query: QUERY,
        variables: { after, stati: ["PUBLISH", "DRAFT"] },
      }),
    });
    const json = (await res.json()) as {
      data?: { berlinerWords: { edges: { node: WpWordNode }[]; pageInfo: { endCursor: string; hasNextPage: boolean } } };
      errors?: unknown[];
    };
    if (json.errors) {
      console.error(JSON.stringify(json.errors, null, 2));
      throw new Error("GraphQL errors");
    }
    const data = json.data?.berlinerWords;
    if (!data) break;
    all.push(...data.edges.map((e) => e.node));
    process.stdout.write(`\rFetched ${all.length}...`);
    if (!data.pageInfo.hasNextPage) break;
    after = data.pageInfo.endCursor;
  }
  process.stdout.write("\n");
  return all;
}

async function main(): Promise<void> {
  const words = await fetchAll();
  console.log(`Total: ${words.length} words`);

  const simplified = words.map((w) => ({
    id: w.id,
    slug: w.slug,
    title: w.title,
    status: w.status ?? null,
    berlinerisch: w.wordProperties.berlinerisch,
    translations: (w.wordProperties.translations ?? []).map((t) => t.translation).filter(Boolean),
    infoText: w.wordProperties.infoText,
    berolinismus: w.wordProperties.berolinismus ?? false,
    examples: (w.wordProperties.examples ?? []).map((e) => ({
      example: e.example,
      explanation: e.exampleExplanation,
    })),
    themen: (w.berlinerischThemen?.nodes ?? []).map((n) => n.slug).filter(Boolean),
  }));

  writeFileSync(OUT_FILE, JSON.stringify(simplified, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${simplified.length} words to ${OUT_FILE}`);

  const byStatus: Record<string, number> = {};
  for (const w of simplified) byStatus[w.status ?? "unknown"] = (byStatus[w.status ?? "unknown"] ?? 0) + 1;
  console.log("By status:", byStatus);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
