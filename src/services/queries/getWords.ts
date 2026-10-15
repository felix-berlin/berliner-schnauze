import type { WordRef } from "@utils/wordHelper.ts";

import { readWordsCache, writeWordsCache } from "@services/devWordsCache";
import { wpGraphqlClient } from "@services/wpGraphqlClient";
import { gql } from "@urql/core";
import { SHOW_TEST_DATA } from "astro:env/client";
import { E2E_WORD_LIMIT } from "astro:env/server";

import type { GetAllWordsQuery, GetAllWordsQueryVariables, PostStatusEnum } from "@/gql/graphql.ts";

import { graphql } from "@/gql";
import { GetAllWordsDocument } from "@/gql/graphql.ts";

// Words the e2e specs (src/tests/e2e/*.spec.ts) navigate to directly by slug —
// always built, even when E2E_WORD_LIMIT caps the number of generated pages.
const E2E_REQUIRED_SLUGS = new Set([
  "aasen",
  "akademiebusen",
  "alex",
  "alsche",
  "anmachen",
  "ballast-der-republik",
  "schale",
  "wa",
]);

// Caps only the generated pages (word + OG routes) in the Playwright CI build.
// The full word set must stay intact: list/letter filters and the
// similar-sounding/neighbor sections are derived from all words.
export const limitPagesForE2e = <T extends { slug: string }>(words: T[]): T[] => {
  const limit = E2E_WORD_LIMIT;
  if (!limit) return words;
  return words.filter(({ slug }, i) => i < limit || E2E_REQUIRED_SLUGS.has(slug));
};

// Dev servers and the Playwright CI build (restored via actions/cache) skip the ~12 sequential requests.
const useDiskCache = import.meta.env.DEV || !!E2E_WORD_LIMIT;
// parallelPrerender workers each load this module (even getStaticPaths runs in them). astro.config.mjs
// sets one id per build; a plain build shares its fetch through a cache entry tagged with it, so
// workers don't each hit WordPress and a leftover of an earlier build is never read.
const buildId = process.env.WORDS_BUILD_ID;

const PAGE_SIZE = 500; // needs graphql_connection_max_query_amount >= 500 on the WP side
const PARALLEL_PAGES = 4;

// WPGraphQL cursors are only post IDs, so walking them without any node fields is cheap
// (~1s/page vs ~4s for full words). That lets the heavy pages be fetched in parallel.
const WordCursorsDocument = gql`
  query WordCursors($after: String, $first: Int, $stati: [PostStatusEnum]) {
    berlinerWords(
      first: $first
      after: $after
      where: { orderby: { field: TITLE, order: ASC }, stati: $stati }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

/** The `after` cursor of every page, starting with `null` for the first one. */
const fetchPageCursors = async (stati: PostStatusEnum[]) => {
  const cursors: (string | null)[] = [null];
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- each cursor comes from the previous response
    const { data, error } = await wpGraphqlClient
      .query(WordCursorsDocument, { after: cursors.at(-1), first: PAGE_SIZE, stati })
      .toPromise();
    const pageInfo = data?.berlinerWords?.pageInfo;
    if (error || !pageInfo) throw error ?? new Error("WPGraphQL returned no berlinerWords");
    if (!pageInfo.hasNextPage) return cursors;
    cursors.push(pageInfo.endCursor);
  }
};

const fetchPaginatedWords = async () => {
  const stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"];
  const allWords: NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"] = [];
  let complete = true;
  const cacheKey = ["words", "TITLE", "ASC", stati.join("-")].join("_");

  const buildCacheKey = `${cacheKey}_build`;
  if (useDiskCache) {
    const cached = await readWordsCache<typeof allWords>(cacheKey);
    if (cached) return cached;
  } else if (buildId) {
    const cached = await readWordsCache<{ buildId: string; edges: typeof allWords }>(buildCacheKey);
    if (cached?.buildId === buildId) return cached.edges;
  }

  console.info("Fetching words...");

  let cursors: (string | null)[] = [];
  try {
    cursors = await fetchPageCursors(stati);
  } catch (error) {
    console.error("Error fetching words:", error);
    complete = false;
  }

  for (let i = 0; i < cursors.length && complete; i += PARALLEL_PAGES) {
    // oxlint-disable-next-line no-await-in-loop -- bounded batches keep the load on WordPress sane
    const responses = await Promise.all(
      cursors.slice(i, i + PARALLEL_PAGES).map((after) => {
        const variables: GetAllWordsQueryVariables = {
          after,
          field: "TITLE",
          first: PAGE_SIZE,
          order: "ASC",
          stati,
        };
        return wpGraphqlClient.query(GetAllWordsDocument, variables).toPromise();
      }),
    );

    for (const response of responses) {
      if (response.error) console.error("Error fetching words:", response.error);
      const data = response.data?.berlinerWords;
      if (response.error || !data) {
        complete = false;
        break;
      }
      allWords.push(...(data.edges as typeof allWords));
    }
  }

  if (useDiskCache && complete) await writeWordsCache(cacheKey, allWords);
  // A partial result is shared too: every thread of this build should see the same words.
  else if (!useDiskCache && buildId) {
    await writeWordsCache(buildCacheKey, { buildId, edges: allWords });
  }

  return allWords;
};

type WordEdges = NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"];
type RawWord = WordEdges[number]["node"];

/** A word as every build-time consumer sees it: slug-less words dropped, nullable basics resolved. */
export type Word = RawWord & {
  slug: string;
  /** Flattened, non-empty `wordProperties.translations`. */
  translations: string[];
  wordProperties: NonNullable<RawWord["wordProperties"]> & { berlinerisch: string };
};

const normalizeWords = (edges: WordEdges): Word[] =>
  edges.flatMap(({ node }) => {
    if (!node.slug || !node.wordProperties) {
      console.warn(
        `[fetchAllWords] Word without slug/wordProperties skipped — id: ${node.id}, berlinerisch: "${node.wordProperties?.berlinerisch ?? "(unknown)"}"`,
      );
      return [];
    }
    const wordProperties = {
      ...node.wordProperties,
      berlinerisch: node.wordProperties.berlinerisch ?? "",
    };
    const translations = (wordProperties.translations ?? [])
      .map((t) => t?.translation)
      .filter((t): t is string => !!t);
    return [{ ...node, slug: node.slug, translations, wordProperties }];
  });

let _allWordsCache: Promise<Word[]> | null = null;

export const fetchAllWords = (): Promise<Word[]> =>
  (_allWordsCache ??= fetchPaginatedWords().then(normalizeWords));

let _wordRefsCache: Promise<WordRef[]> | null = null;

/** Slim refs of every word (what the neighbor/anagram/similar-sounding sections compare against). */
export const fetchWordRefs = (): Promise<WordRef[]> =>
  (_wordRefsCache ??= fetchAllWords().then((words) =>
    words.map(({ id, slug, wordProperties }) => ({
      id,
      slug,
      wordProperties: { berlinerisch: wordProperties.berlinerisch },
    })),
  ));

export const GetAllWords = graphql(`
  query GetAllWords(
    $after: String = ""
    $first: Int = 100
    $field: PostObjectsConnectionOrderbyEnum = TITLE
    $order: OrderEnum = ASC
    $stati: [PostStatusEnum] = PUBLISH
  ) {
    berlinerWords(
      first: $first
      after: $after
      where: { orderby: { field: $field, order: $order }, stati: $stati }
    ) {
      edges {
        node {
          ...BerlinerWord
        }
        cursor
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`);
