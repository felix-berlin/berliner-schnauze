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
import { GetAllWordsDocument, GetAllWordsLinksDocument } from "@/gql/graphql.ts";

// Words the e2e specs (tests/e2e/*.spec.ts) navigate to directly by slug —
// guaranteed to be present even when E2E_WORD_LIMIT truncates the
// alphabetical (TITLE-ordered) fetch below before reaching these.
const E2E_REQUIRED_SLUGS = [
  "aasen",
  "akademiebusen",
  "alex",
  "alsche",
  "anmachen",
  "ballast-der-republik",
  "schale",
  "wa",
];

const fetchPaginatedWords = async (
  queryDocument: typeof GetAllWordsDocument | typeof GetAllWordsLinksDocument,
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
) => {
  const allWords: NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"] = [];
  let cursor = null;
  const pageSize = 100;

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
    const response = await wpGraphqlClient.query(queryDocument, variables).toPromise();

    if (response.error) {
      console.error("Error fetching words:", response.error);
      break;
    }

    const data = response.data?.berlinerWords;
    if (!data) break;

    allWords.push(...(data.edges as typeof allWords));
    cursor = data.pageInfo.endCursor;

    if (!data.pageInfo.hasNextPage) {
      break;
    }
    if (E2E_WORD_LIMIT && allWords.length >= E2E_WORD_LIMIT) {
      break;
    }
  }

  if (E2E_WORD_LIMIT) {
    const missingSlugs = E2E_REQUIRED_SLUGS.filter(
      (slug) => !allWords.some((edge) => edge.node.slug === slug),
    );
    if (missingSlugs.length > 0) {
      const extra = await wpGraphqlClient
        .query(queryDocument, { first: missingSlugs.length, nameIn: missingSlugs, stati })
        .toPromise();
      const extraEdges = extra.data?.berlinerWords?.edges;
      if (extraEdges) {
        allWords.push(...(extraEdges as typeof allWords));
      }
    }
  }

  return allWords;
};

type WordEdges = NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"];

let _allWordsCache: Promise<WordEdges> | null = null;
let _allWordsLinksCache: Promise<WordEdges> | null = null;

export const fetchAllWords = async (
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
): Promise<WordEdges> => {
  _allWordsCache ??= fetchPaginatedWords(GetAllWordsDocument, orderByField, orderByType, stati);
  return _allWordsCache;
};

export const fetchAllWordsLinks = async (
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
): Promise<WordEdges> => {
  _allWordsLinksCache ??= fetchPaginatedWords(
    GetAllWordsLinksDocument,
    orderByField,
    orderByType,
    stati,
  );
  return _allWordsLinksCache;
};

export const GetAllWords = graphql(`
  query GetAllWords(
    $after: String = ""
    $first: Int = 100
    $field: PostObjectsConnectionOrderbyEnum = TITLE
    $order: OrderEnum = ASC
    $stati: [PostStatusEnum] = PUBLISH
    $nameIn: [String]
  ) {
    berlinerWords(
      first: $first
      after: $after
      where: { orderby: { field: $field, order: $order }, stati: $stati, nameIn: $nameIn }
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

export const GetAllWordsLinks = graphql(`
  query GetAllWordsLinks(
    $after: String = ""
    $first: Int = 100
    $field: PostObjectsConnectionOrderbyEnum = TITLE
    $order: OrderEnum = ASC
    $stati: [PostStatusEnum] = PUBLISH
    $nameIn: [String]
  ) {
    berlinerWords(
      first: $first
      after: $after
      where: { orderby: { field: $field, order: $order }, stati: $stati, nameIn: $nameIn }
    ) {
      edges {
        node {
          slug
          wordGroup
          wordProperties {
            berlinerisch
          }
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
