import { readWordsCache, writeWordsCache } from "@services/devWordsCache";
import { wpGraphqlClient } from "@services/wpGraphqlClient";
import { SHOW_TEST_DATA } from "astro:env/client";
import { E2E_WORD_LIMIT } from "astro:env/server";

import type {
  GetAllWordsQuery,
  GetAllWordsQueryVariables,
  OrderEnum,
  PostObjectsConnectionOrderbyEnum,
  PostStatusEnum,
} from "@/gql/graphql.ts";

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
export const limitPagesForE2e = <T extends { node: { slug?: string | null } }>(edges: T[]): T[] => {
  const limit = E2E_WORD_LIMIT;
  if (!limit) return edges;
  return edges.filter(({ node }, i) => i < limit || E2E_REQUIRED_SLUGS.has(node.slug ?? ""));
};

const fetchPaginatedWords = async (
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
) => {
  const allWords: NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"] = [];
  let cursor = null;
  let complete = true;
  const pageSize = 500; // needs graphql_connection_max_query_amount >= 500 on the WP side
  const cacheKey = ["words", orderByField, orderByType, stati.join("-")].join("_");

  if (import.meta.env.DEV) {
    const cached = await readWordsCache<typeof allWords>(cacheKey);
    if (cached) return cached;
  }

  while (true) {
    console.info("Fetching words...", allWords.length);

    const variables: GetAllWordsQueryVariables = {
      after: cursor,
      field: orderByField,
      first: pageSize,
      order: orderByType,
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

  if (import.meta.env.DEV && complete) await writeWordsCache(cacheKey, allWords);

  return allWords;
};

type WordEdges = NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"];

let _allWordsCache: Promise<WordEdges> | null = null;

export const fetchAllWords = async (
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
): Promise<WordEdges> => {
  _allWordsCache ??= fetchPaginatedWords(orderByField, orderByType, stati);
  return _allWordsCache;
};

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
