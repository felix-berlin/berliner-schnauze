import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { SHOW_TEST_DATA, WP_API, WP_REST_API } from "astro:env/client";
import { WP_AUTH_PASS, WP_AUTH_USER } from "astro:env/server";

import type {
  GetAllWordsQuery,
  GetAllWordsQueryVariables,
  OrderEnum,
  PostObjectsConnectionOrderbyEnum,
  PostStatusEnum,
} from "@/gql/graphql.ts";

import { graphql } from "@/gql";
import { GetAllWordsDocument, GetAllWordsLinksDocument } from "@/gql/graphql.ts";

let _devAuthToken: string | null = null;
let _devAuthTokenPromise: Promise<string | null> | null = null;

const fetchDevAuthToken = (): Promise<string | null> => {
  if (!WP_AUTH_USER || !WP_AUTH_PASS) {
    console.warn("SHOW_TEST_DATA is true but WP_AUTH_USER/WP_AUTH_PASS are not set — drafts won't be fetched.");
    return Promise.resolve(null);
  }
  _devAuthTokenPromise ??= fetch(`${WP_REST_API}/jwt-auth/v1/token`, {
    body: JSON.stringify({ password: WP_AUTH_PASS, username: WP_AUTH_USER }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
    .then(async (res) => {
      if (!res.ok) {
        console.warn("Failed to get dev auth token:", res.status);
        return null;
      }
      const { token } = (await res.json()) as { token: string };
      _devAuthToken = token;
      return token;
    })
    .catch((e) => {
      console.warn("Failed to get dev auth token:", e);
      return null;
    });
  return _devAuthTokenPromise;
};

const client = new Client({
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => ({
    headers: {
      "Content-Type": "application/json",
      ...(_devAuthToken ? { Authorization: `Bearer ${_devAuthToken}` } : {}),
    },
  }),
  url: WP_API,
});

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
    const response = await client.query(queryDocument, variables).toPromise();

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
  if (SHOW_TEST_DATA) await fetchDevAuthToken();
  _allWordsCache ??= fetchPaginatedWords(GetAllWordsDocument, orderByField, orderByType, stati);
  return _allWordsCache;
};

export const fetchAllWordsLinks = async (
  orderByField: PostObjectsConnectionOrderbyEnum = "TITLE",
  orderByType: OrderEnum = "ASC",
  stati: PostStatusEnum[] = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
): Promise<WordEdges> => {
  if (SHOW_TEST_DATA) await fetchDevAuthToken();
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
