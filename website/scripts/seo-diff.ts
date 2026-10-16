#!/usr/bin/env node
/**
 * Compares the SEO head (title, description, canonical, robots, og/twitter, JSON-LD, lang) and the status code of
 * the same URLs on two origins, e.g. the current production site and the new stack. Exits 1 on any difference.
 *
 * Usage:
 *   pnpm dlx tsx website/scripts/seo-diff.ts https://berliner-schnauze.wtf http://localhost:4321 [website/scripts/seo-urls.txt]
 *
 * Differences that are expected (media now served from the CMS under /api/media/file) go into IGNORED below.
 */

import { readFileSync } from "node:fs";

import { diffSeo, extractSeo, normalizeForMigration } from "./lib/seo-extract.ts";

// Expected differences of the move are removed by normalizeForMigration (see scripts/lib/seo-extract.ts).
// og:image dimensions follow the stored file now: WordPress reported the original size of a "-scaled" upload.
const IGNORED = ["meta[og:image:width]", "meta[og:image:height]"];

// Deliberate differences, listed instead of hidden. The homepage used to name itself /index (a url that only
// redirects to /); it now names /, and /index is redirected permanently (public/_redirects).
const KNOWN: { keys: string[]; path: string }[] = [
  { keys: ["canonical", "meta[og:url]", "meta[twitter:url]"], path: "/" },
];

const [originA, originB, listFile = new URL("./seo-urls.txt", import.meta.url).pathname] =
  process.argv.slice(2);
if (!originA || !originB) {
  console.error("Usage: seo-diff.ts <originA> <originB> [urlList]");
  process.exit(2);
}

const paths = readFileSync(listFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

// Side B is usually a local server: send what the reverse proxy sends, so Astro.url gets the production origin.
const forwarded = (origin: string, like: string): Record<string, string> =>
  new URL(origin).hostname === new URL(like).hostname
    ? {}
    : {
        "X-Forwarded-Host": new URL(like).host,
        "X-Forwarded-Proto": new URL(like).protocol.slice(0, -1),
      };

const get = async (origin: string, path: string, headers: Record<string, string> = {}) => {
  const res = await fetch(new URL(path, origin), {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  return {
    html: res.headers.get("content-type")?.includes("html") ? await res.text() : "",
    status: res.status,
  };
};

let different = 0;
for (const path of paths) {
  const [a, b] = await Promise.all([
    get(originA, path),
    get(originB, path, forwarded(originB, originA)),
  ]);
  const diffs = [];
  if (a.status !== b.status) diffs.push({ a: a.status, b: b.status, key: "status" });
  // Compare the head only for pages both sides render.
  else if (a.html && b.html)
    diffs.push(
      ...diffSeo(
        normalizeForMigration(extractSeo(a.html)),
        normalizeForMigration(extractSeo(b.html)),
        { ignore: IGNORED },
      ),
    );

  if (diffs.length === 0) {
    console.log(`ok    ${path}`);
    continue;
  }
  const known = KNOWN.find((k) => k.path === path)?.keys ?? [];
  if (diffs.every((d) => known.includes(d.key))) {
    console.log(`known ${path}  (${diffs.map((d) => d.key).join(", ")})`);
    continue;
  }
  different++;
  console.log(`DIFF  ${path}`);
  for (const d of diffs)
    console.log(
      `        ${d.key}\n          A: ${JSON.stringify(d.a)?.slice(0, 200)}\n          B: ${JSON.stringify(d.b)?.slice(0, 200)}`,
    );
}

console.log(`\n${paths.length - different}/${paths.length} URLs identical`);
process.exit(different ? 1 : 0);
