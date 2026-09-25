import { readWordsCache, writeWordsCache } from "@services/devWordsCache";
import { wpGraphqlClient } from "@services/wpGraphqlClient";
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

// Dev servers and the Playwright CI build (restored via actions/cache) skip the ~60 sequential requests.
const useDiskCache = import.meta.env.DEV || !!E2E_WORD_LIMIT;

const fetchPaginatedWords = async () => {
  const stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"];
  const allWords: NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"] = [];
  let cursor = null;
  let complete = true;
  const pageSize = 500; // needs graphql_connection_max_query_amount >= 500 on the WP side
  const cacheKey = ["words", "TITLE", "ASC", stati.join("-")].join("_");

  if (useDiskCache) {
    const cached = await readWordsCache<typeof allWords>(cacheKey);
    if (cached) return cached;
  }

  while (true) {
    console.info("Fetching words...", allWords.length);

    const variables: GetAllWordsQueryVariables = {
      after: cursor,
      field: "TITLE",
      first: pageSize,
      order: "ASC",
      stati,
    };
    // oxlint-disable-next-line no-await-in-loop -- cursor-based pagination: each page's cursor depends on the previous response
    const response = await wpGraphqlClient.query(GetAllWordsDocument, variables).toPromise();

    if (response.error) {
      console.error("Error fetching words:", response.error);
      complete = false;
      break;
    }

    const data = response.data?.berlinerWords;
    if (!data) {
      complete = false;
      break;
    }

    allWords.push(...(data.edges as typeof allWords));
    cursor = data.pageInfo.endCursor;

    if (!data.pageInfo.hasNextPage) {
      break;
    }
  }

  if (useDiskCache && complete) await writeWordsCache(cacheKey, allWords);

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
