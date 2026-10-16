/**
 * Idempotent WordPress -> Payload import. CLI: `pnpm --filter payload-app import:wp`
 * (needs WP_API, WP_AUTH_USER, WP_AUTH_PASS plus the Payload env). Exits 1 on any failure.
 */
import type { CollectionSlug, Payload } from "payload";

import path from "node:path";

import type { ImportRefs } from "./mappers";
import type { WpPage, WpPost, WpThema, WpWord, WpWordType } from "./wp";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../fields/contentModified";
import { collectMedia, mapPage, mapPost, mapRelatedWords, mapThema, mapWord } from "./mappers";
import {
  AFFILIATE_QUERY,
  COMPANY_QUERY,
  MENU_QUERY,
  PAGES_QUERY,
  POSTS_QUERY,
  THEMEN_QUERY,
  WORD_TYPES_QUERY,
  WORDS_QUERY,
  wpGraphql,
} from "./wp";

export type ImportPhase = "media" | "taxonomies" | "words" | "posts" | "pages" | "globals";
export type ImportReport = {
  created: Record<string, number>;
  updated: Record<string, number>;
  missingRelated: number;
  failures: { kind: string; ref: string; error: string }[];
  /** Not fatal (exit code unaffected): `html-image` = `<img>` turned into a link, `media-foreign-host` = not downloaded. */
  warnings: { kind: string; ref: string; src: string }[];
};

const PHASES: ImportPhase[] = ["media", "taxonomies", "words", "posts", "pages", "globals"];
const PAGE_SLUGS = ["datenschutz", "impressum"];
const MENUS = { main: "Main Menu", footer1: "Footer Nav 1", footer2: "Footer Nav 2" } as const;
const WORDS_PAGE_SIZE = 100;
const MEDIA_CONCURRENCY = 5;
const WORD_CONTEXT = { [PRESERVE_CONTENT_MODIFIED_AT]: true };

type Maybe<T> = T | null | undefined;
type Connection<T> = Maybe<{ nodes?: Maybe<Maybe<T>[]>; pageInfo?: Maybe<{ hasNextPage?: Maybe<boolean>; endCursor?: Maybe<string> }> }>;

export const exitCodeFor = (report: ImportReport): number => (report.failures.length > 0 ? 1 : 0);

const nodesOf = <T>(conn: Connection<T>, what: string): T[] => {
  if (!conn) throw new Error(`WPGraphQL returned no ${what}`);
  if (conn.pageInfo?.hasNextPage) throw new Error(`${what}: more than one page, the import would be incomplete`);
  return (conn.nodes ?? []).filter((n): n is T => n != null);
};

/** All words, 100 per page, sequentially. Any page failing throws: a partial word set is never returned. */
async function fetchWords(): Promise<WpWord[]> {
  const words: WpWord[] = [];
  let after: string | null = null;
  do {
    // oxlint-disable-next-line no-await-in-loop -- each cursor comes from the previous page
    const data: { berlinerWords: Connection<WpWord> } = await wpGraphql(WORDS_QUERY, { after, first: WORDS_PAGE_SIZE });
    const conn = data.berlinerWords;
    if (!conn) throw new Error(`WPGraphQL returned no berlinerWords after ${words.length} words`);
    words.push(...(conn.nodes ?? []).filter((n): n is WpWord => n != null));
    after = conn.pageInfo?.hasNextPage ? (conn.pageInfo.endCursor ?? null) : null;
    if (conn.pageInfo?.hasNextPage && !after) throw new Error("berlinerWords: hasNextPage without endCursor");
  } while (after);
  return words;
}

/** Bounded-concurrency for-each; `fn` handles its own errors. */
async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    // oxlint-disable-next-line no-await-in-loop -- this is the bounded worker loop
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function runImport(payload: Payload, opts: { only?: ImportPhase[] } = {}): Promise<ImportReport> {
  const only = new Set(opts.only ?? PHASES);
  const report: ImportReport = { created: {}, updated: {}, missingRelated: 0, failures: [], warnings: [] };
  const htmlImage = (ref: string) => (src: string) => report.warnings.push({ kind: "html-image", ref, src });
  // Media are downloaded only from the WordPress host itself.
  const wpOrigin = process.env.WP_API ? new URL(process.env.WP_API).origin : null;
  const fail = (kind: string, ref: string, error: unknown) => {
    report.failures.push({ kind, ref, error: error instanceof Error ? error.message : String(error) });
    console.error(`[import] ${kind} ${ref}: ${error instanceof Error ? error.message : String(error)}`);
  };
  const tally = (kind: string, created: boolean) => {
    const bucket = created ? report.created : report.updated;
    bucket[kind] = (bucket[kind] ?? 0) + 1;
  };
  const list = async <T>(kind: string, fetcher: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fetcher();
    } catch (error) {
      fail(kind, "list", error);
      return undefined;
    }
  };

  // Existing documents (from earlier runs) double as upsert index and refs for skipped phases.
  const existing = async <K extends string | number>(collection: CollectionSlug, key: string) => {
    const { docs } = await payload.find({ collection, pagination: false, depth: 0, select: { [key]: true } as never });
    const map = new Map<K, number>();
    for (const doc of docs as unknown as Record<string, unknown>[]) if (doc[key] != null) map.set(doc[key] as K, doc.id as number);
    return map;
  };
  const byWpId = {
    "word-types": await existing<number>("word-types", "wpId"),
    themen: await existing<number>("themen", "wpId"),
    words: await existing<number>("words", "wpId"),
    posts: await existing<number>("posts", "wpId"),
    pages: await existing<number>("pages", "wpId"),
  };
  const refs: ImportRefs = {
    mediaIdByUrl: await existing<string>("media", "wpPath"),
    wordTypeIdByName: await existing<string>("word-types", "name"),
    themaIdBySlug: await existing<string>("themen", "slug"),
    wordIdByWpId: byWpId.words,
  };

  /** find-by-wpId (preloaded) -> update or create. Returns the stored doc (depth 0). */
  const upsert = async (collection: keyof typeof byWpId, wpId: number, data: object, context?: Record<string, unknown>) => {
    const id = byWpId[collection].get(wpId);
    const doc = (
      id == null
        ? await payload.create({ collection, data: data as never, depth: 0, context })
        : await payload.update({ collection, id, data: data as never, depth: 0, context })
    ) as unknown as Record<string, unknown> & { id: number };
    byWpId[collection].set(wpId, doc.id);
    tally(collection, id == null);
    return doc;
  };

  // --- Listing WordPress ---
  const needMediaSources = only.has("media");
  const words = needMediaSources || only.has("words") ? await list("words", fetchWords) : undefined;
  const posts =
    needMediaSources || only.has("posts")
      ? await list("posts", async () => nodesOf((await wpGraphql<{ posts: Connection<WpPost> }>(POSTS_QUERY)).posts, "posts"))
      : undefined;
  const pages =
    needMediaSources || only.has("pages")
      ? await list("pages", async () => nodesOf((await wpGraphql<{ pages: Connection<WpPage> }>(PAGES_QUERY, { slugs: PAGE_SLUGS })).pages, "pages"))
      : undefined;
  const themen =
    needMediaSources || only.has("taxonomies")
      ? await list("themen", async () => nodesOf((await wpGraphql<{ berlinerischThemen: Connection<WpThema> }>(THEMEN_QUERY)).berlinerischThemen, "berlinerischThemen"))
      : undefined;
  const wordTypes = only.has("taxonomies")
    ? await list("word-types", async () =>
        nodesOf((await wpGraphql<{ berlinerischWordTypes: Connection<WpWordType> }>(WORD_TYPES_QUERY)).berlinerischWordTypes, "berlinerischWordTypes"),
      )
    : undefined;

  // --- Media ---
  if (only.has("media")) {
    const media = [...collectMedia(words ?? [], posts ?? [], pages ?? [], themen ?? []).entries()];
    console.info(`[import] media: ${media.length} files`);
    await eachLimit(media, MEDIA_CONCURRENCY, async ([wpPath, meta]) => {
      const data = { wpPath, alt: meta.alt ?? null, caption: meta.caption ?? null, description: meta.description ?? null };
      try {
        const id = refs.mediaIdByUrl.get(wpPath);
        if (id != null) {
          await payload.update({ collection: "media", id, data, depth: 0 }); // metadata only, no re-download
          tally("media", false);
          return;
        }
        if (new URL(meta.url).origin !== wpOrigin) {
          report.warnings.push({ kind: "media-foreign-host", ref: meta.url, src: meta.url });
          return;
        }
        const res = await fetch(meta.url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const file = Buffer.from(await res.arrayBuffer());
        const mimetype = res.headers.get("content-type")?.split(";")[0].trim() || "application/octet-stream";
        const doc = await payload.create({
          collection: "media",
          data,
          depth: 0,
          file: { data: file, mimetype, name: path.posix.basename(wpPath), size: file.length },
        });
        refs.mediaIdByUrl.set(wpPath, doc.id);
        tally("media", true);
      } catch (error) {
        fail("media", meta.url, error);
      }
    });
  }

  // --- Taxonomies ---
  let taxonomiesOk = true;
  if (only.has("taxonomies")) {
    taxonomiesOk = !!wordTypes && !!themen;
    for (const t of wordTypes ?? []) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
        const doc = await upsert("word-types", t.databaseId, { wpId: t.databaseId, name: t.name ?? "", slug: t.slug ?? null });
        if (t.name) refs.wordTypeIdByName.set(t.name, doc.id);
      } catch (error) {
        taxonomiesOk = false;
        fail("word-types", t.slug ?? String(t.databaseId), error);
      }
    }
    for (const t of themen ?? []) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
        const doc = await upsert("themen", t.databaseId, mapThema(t, refs));
        if (t.slug) refs.themaIdBySlug.set(t.slug, doc.id);
      } catch (error) {
        taxonomiesOk = false;
        fail("themen", t.slug ?? String(t.databaseId), error);
      }
    }
  }

  // --- Words ---
  if (only.has("words") && words) {
    if (!taxonomiesOk) {
      fail("words", "phase", "skipped: taxonomies failed, words would lose their word types/themen");
    } else {
      console.info(`[import] words: ${words.length}`);
      const stored = new Map<number, number[]>(); // wpId -> relatedWords after pass 1
      for (const [i, node] of words.entries()) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
          const data = await mapWord(node, refs, payload.config, htmlImage(node.slug ?? String(node.databaseId)));
          // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
          const doc = await upsert("words", node.databaseId, data, WORD_CONTEXT);
          stored.set(node.databaseId, ((doc.relatedWords as number[] | null) ?? []).map(Number));
        } catch (error) {
          fail("words", node.slug ?? String(node.databaseId), error);
        }
        if ((i + 1) % 500 === 0) console.info(`[import] words pass 1: ${i + 1}/${words.length}`);
      }
      for (const node of words) {
        const current = stored.get(node.databaseId);
        if (!current) continue; // pass 1 failed, already reported
        const { ids, missing } = mapRelatedWords(node, refs);
        report.missingRelated += missing;
        if (ids.length === current.length && ids.every((id, i) => id === current[i])) continue;
        try {
          // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
          await payload.update({ collection: "words", id: refs.wordIdByWpId.get(node.databaseId)!, data: { relatedWords: ids }, depth: 0, context: WORD_CONTEXT });
        } catch (error) {
          fail("words", `${node.slug ?? node.databaseId} (relatedWords)`, error);
        }
      }
    }
  }

  // --- Posts & pages ---
  if (only.has("posts")) {
    for (const node of posts ?? []) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
        await upsert("posts", node.databaseId, await mapPost(node, refs, payload.config, htmlImage(node.slug ?? String(node.databaseId))));
      } catch (error) {
        fail("posts", node.slug ?? String(node.databaseId), error);
      }
    }
  }
  if (only.has("pages")) {
    for (const node of pages ?? []) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential Local API writes
        await upsert("pages", node.databaseId, await mapPage(node, refs, payload.config, htmlImage(node.slug ?? String(node.databaseId))));
      } catch (error) {
        fail("pages", node.slug ?? String(node.databaseId), error);
      }
    }
  }

  // --- Globals ---
  if (only.has("globals")) {
    const global = async (slug: "navigation" | "affiliate" | "company", build: () => Promise<object>) => {
      try {
        await payload.updateGlobal({ slug, data: (await build()) as never, depth: 0 });
        tally("globals", false);
      } catch (error) {
        fail("globals", slug, error);
      }
    };
    await global("navigation", async () => {
      const menus: Record<string, unknown[]> = {};
      for (const [field, name] of Object.entries(MENUS)) {
        // oxlint-disable-next-line no-await-in-loop -- three small sequential requests
        const data = await wpGraphql<{ menu: Maybe<{ menuItems: Connection<{ description?: Maybe<string>; label?: Maybe<string>; linkRelationship?: Maybe<string>; path?: Maybe<string> }> }> }>(MENU_QUERY, { name });
        if (!data.menu) throw new Error(`menu "${name}" not found`);
        menus[field] = nodesOf(data.menu.menuItems, `menu "${name}"`).flatMap((n) =>
          n.path && n.label ? [{ title: n.label, link: n.path, rel: n.linkRelationship || null, description: n.description || null }] : [],
        );
      }
      return menus;
    });
    await global("affiliate", async () => {
      type Fields = { books?: Maybe<Maybe<Record<string, unknown>>[]>; disclaimers?: Maybe<Maybe<Record<string, unknown>>[]> };
      const data = await wpGraphql<{ affliate: Maybe<{ affliateLinksFields: Maybe<Fields> }> }>(AFFILIATE_QUERY);
      const fields = data.affliate?.affliateLinksFields;
      if (!fields) throw new Error("affliateLinksFields missing");
      return { books: (fields.books ?? []).filter(Boolean), disclaimers: (fields.disclaimers ?? []).filter(Boolean) };
    });
    await global("company", async () => {
      type Info = {
        funding?: Maybe<Maybe<{ name?: Maybe<string>; link?: Maybe<string>; adresse?: Maybe<string> }>[]>;
        socialMedia?: Maybe<Maybe<{ rel?: Maybe<string>; networkprofile?: Maybe<string>; networkname?: Maybe<Maybe<string>[]> }>[]>;
      };
      const data = await wpGraphql<{ company: Maybe<{ companyInformations: Maybe<Info> }> }>(COMPANY_QUERY);
      const info = data.company?.companyInformations;
      if (!info) throw new Error("companyInformations missing");
      return {
        funding: (info.funding ?? []).flatMap((f) => (f?.name ? [{ name: f.name, link: f.link || null, adresse: f.adresse || null }] : [])),
        // ACF select "Both (Array)": networkname is [value, label].
        socialMedia: (info.socialMedia ?? []).flatMap((s) =>
          s?.networkprofile ? [{ network: s.networkname?.[0] ?? null, label: s.networkname?.[1] ?? null, profile: s.networkprofile, rel: s.rel || null }] : [],
        ),
      };
    });
  }

  return report;
}

// CLI entry (`payload run src/import/run.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  const [{ getPayload }, { default: config }] = await Promise.all([import("payload"), import("../payload.config")]);
  const report = await runImport(await getPayload({ config }));
  console.log(JSON.stringify(report, null, 2));
  console.log(`[import] ${report.failures.length ? `FAILED: ${report.failures.length} failure(s)` : "OK"}, ${report.warnings.length} warning(s)`);
  process.exit(exitCodeFor(report));
}
