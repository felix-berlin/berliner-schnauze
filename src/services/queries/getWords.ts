import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { SHOW_TEST_DATA } from "astro:env/client";
import { WP_API } from "astro:env/client";

import type {
  GetAllWordsQueryVariables,
  RootQueryToBerlinerWordConnectionEdge,
} from "@/gql/graphql.ts";

import { graphql } from "@/gql";
import {
  GetAllWordsDocument,
  GetAllWordsLinksDocument,
  OrderEnum,
  PostObjectsConnectionOrderbyEnum,
  PostStatusEnum,
} from "@/gql/graphql.ts";

const client = new Client({
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: {
    headers: {
      "Content-Type": "application/json",
    },
  },
  url: WP_API,
});

const fetchPaginatedWords = async (
  queryDocument: any,
  orderByField = PostObjectsConnectionOrderbyEnum.Title,
  orderByType = OrderEnum.Asc,
  stati = SHOW_TEST_DATA
    ? [PostStatusEnum.Draft, PostStatusEnum.Publish]
    : [PostStatusEnum.Publish],
) => {
  let allWords: RootQueryToBerlinerWordConnectionEdge[] = [];
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

    allWords = [...allWords, ...data.edges];
    cursor = data.pageInfo.endCursor;

    if (!data.pageInfo.hasNextPage) {
      break;
    }
  }

  return allWords;
};

export const fetchAllWords = async (
  orderByField = PostObjectsConnectionOrderbyEnum.Title,
  orderByType = OrderEnum.Asc,
  stati = SHOW_TEST_DATA
    ? [PostStatusEnum.Draft, PostStatusEnum.Publish]
    : [PostStatusEnum.Publish],
) => {
  return fetchPaginatedWords(GetAllWordsDocument, orderByField, orderByType, stati);
};

export const fetchAllWordsLinks = async (
  orderByField = PostObjectsConnectionOrderbyEnum.Title,
  orderByType = OrderEnum.Asc,
  stati = SHOW_TEST_DATA
    ? [PostStatusEnum.Draft, PostStatusEnum.Publish]
    : [PostStatusEnum.Publish],
) => {
  return fetchPaginatedWords(GetAllWordsLinksDocument, orderByField, orderByType, stati);
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
          id
          slug
          title
          wordGroup
          dateGmt
          modifiedGmt
          berlinerWordId
          wordProperties {
            article
            berlinerisch
            berlinerischAudio {
              audio {
                node {
                  mediaItemUrl
                }
              }
              gender
            }
            learnMore
            berolinismus
            examples {
              example
              exampleExplanation
              exampleAudio {
                gender
                audio {
                  node {
                    mediaItemUrl
                  }
                }
              }
            }
            translations {
              translation
            }
            alternativeWords {
              alternativeWord
            }
            relatedWords {
              nodes {
                ... on BerlinerWord {
                  id
                  wordProperties {
                    berlinerisch
                  }
                  slug
                }
              }
            }
            wikimediaFiles {
              wikimediaFile
              description
              caption
            }
            infoText
            images {
              nodes {
                sourceUrl
                mediaDetails {
                  height
                  width
                }
                caption(format: RENDERED)
                altText
                description(format: RENDERED)
              }
            }
          }
          berlinerischWordTypes {
            nodes {
              name
            }
          }
          seo {
            ...PostTypeSeoFragment
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
