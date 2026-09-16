#!/usr/bin/env node
/**
 * Publishes all draft `berlinerisch` posts via WP REST API.
 *
 * Usage:
 *   infisical run -- pnpm dlx tsx scripts/publish-drafts.ts --dry-run
 *   infisical run -- pnpm dlx tsx scripts/publish-drafts.ts
 *
 * Requires env vars: WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS
 */

import { wpFetch, delay } from "./lib/wp-rest.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const POST_TYPE_REST_BASE = "berlinerisch";
const RATE_MS = 150;

interface WpPost {
  id: number;
  slug: string;
  title: { rendered: string };
}

async function fetchAllDrafts(): Promise<WpPost[]> {
  const drafts: WpPost[] = [];
  for (let page = 1; ; page++) {
    const batch = await wpFetch<WpPost[]>(
      `/${POST_TYPE_REST_BASE}?status=draft&per_page=100&page=${page}`,
    );
    drafts.push(...batch);
    if (batch.length < 100) break;
  }
  return drafts;
}

const drafts = await fetchAllDrafts();
console.log(`Found ${drafts.length} draft(s).`);

for (const post of drafts) {
  console.log(`${DRY_RUN ? "[dry-run] would publish" : "publishing"}: ${post.title.rendered} (${post.slug})`);
  if (DRY_RUN) continue;

  await wpFetch(`/${POST_TYPE_REST_BASE}/${post.id}`, {
    method: "POST",
    body: JSON.stringify({ status: "publish" }),
  });
  await delay(RATE_MS);
}

console.log(DRY_RUN ? "Dry run complete." : "Done.");
