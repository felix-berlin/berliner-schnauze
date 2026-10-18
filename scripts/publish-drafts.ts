#!/usr/bin/env node
/**
 * Publishes all draft words in Payload via the REST API.
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/publish-drafts.ts --dry-run
 *   infisical run -- pnpm dlx tsx scripts/publish-drafts.ts
 *
 * Requires env vars: PAYLOAD_URL, PAYLOAD_API_KEY
 */

import { setTimeout as delay } from "node:timers/promises";

import { payloadFetch } from "./lib/payload-rest.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const RATE_MS = 150;
const PAGE_SIZE = 100;

interface DraftWord {
  berlinerisch: string;
  id: number;
  slug: string | null;
}

interface WordsPage {
  docs: DraftWord[];
  hasNextPage: boolean;
}

async function fetchAllDrafts(): Promise<DraftWord[]> {
  const drafts: DraftWord[] = [];
  for (let page = 1; ; page++) {
    const result = await payloadFetch<WordsPage>(
      `/words?where[_status][equals]=draft&limit=${PAGE_SIZE}&page=${page}&depth=0`,
    );
    drafts.push(...result.docs);
    if (!result.hasNextPage) break;
  }
  return drafts;
}

const drafts = await fetchAllDrafts();
console.log(`Found ${drafts.length} draft(s).`);

for (const word of drafts) {
  console.log(
    `${DRY_RUN ? "[dry-run] would publish" : "publishing"}: ${word.berlinerisch} (${word.slug ?? `id ${word.id}`})`,
  );
  if (DRY_RUN) continue;

  await payloadFetch(`/words/${word.id}`, {
    body: JSON.stringify({ _status: "published" }),
    method: "PATCH",
  });
  await delay(RATE_MS);
}

console.log(DRY_RUN ? "Dry run complete." : "Done.");
