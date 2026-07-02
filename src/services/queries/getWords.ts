import { SHOW_TEST_DATA } from "astro:env/client";

import type {
  GetAllWordsQuery,
  GetAllWordsQueryVariables,
  OrderEnum,
  PostObjectsConnectionOrderbyEnum,
  PostStatusEnum,
} from "@/gql/graphql.ts";

import { graphql } from "@/gql";
import { GetAllWordsDocument, GetAllWordsLinksDocument } from "@/gql/graphql.ts";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

const fetchPaginatedWords = async (
  queryDocument: typeof GetAllWordsDocument | typeof GetAllWordsLinksDocument,
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
) => {
  let allWords: NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"] = [];
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
    const response = await wpGraphqlClient.query(queryDocument, variables).toPromise();

    if (response.error) {
      console.error("Error fetching words:", response.error);
      break;
    }

    const data = response.data?.berlinerWords;
    if (!data) break;

    allWords = [...allWords, ...(data.edges as typeof allWords)];
    cursor = data.pageInfo.endCursor;

    if (!data.pageInfo.hasNextPage) {
      break;
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
  _allWordsLinksCache ??= fetchPaginatedWords(GetAllWordsLinksDocument, orderByField, orderByType, stati);
  return _allWordsLinksCache;
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

export const GetAllWordsLinks = graphql(`
  query GetAllWordsLinks(
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
