import { fetchAPI } from "@services/fetchApi.ts";
import { seo } from "@services/graphQlQueryParts.ts";
import type { RootQueryToBerlinerWordConnectionEdge } from "@/gql/graphql.ts";
import { SHOW_TEST_DATA } from "astro:env/client";
import { graphql } from "@/gql";
import { GetAllWordsDocument } from "@/gql/graphql.ts";
import { WP_API } from "astro:env/client";
import { Client, cacheExchange, fetchExchange } from "@urql/core";

type WordEdge = {
  node: {
    slug: string;
  };
  cursor: string;
};

type PageInfo = {
  endCursor: string;
  hasNextPage: boolean;
};

type BerlinerWordsData = {
  berlinerWords: {
    edges: WordEdge[];
    pageInfo: PageInfo;
  };
};

const client = new Client({
  url: WP_API,
  fetchOptions: {
    headers: {
      "Content-Type": "application/json",
    },
  },
  exchanges: [cacheExchange, fetchExchange],
});

export const getAllWords = async (
  orderByField = "TITLE",
  orderByType = "ASC",
  stati = SHOW_TEST_DATA ? "[DRAFT, PUBLISH]" : "[PUBLISH]",
): Promise<RootQueryToBerlinerWordConnectionEdge[]> => {
  let allWords: WordEdge[] = [];
  let cursor: string | null = null;
  const pageSize = 100;

  while (true) {
    const data: BerlinerWordsData = await fetchAPI(`
    {
      berlinerWords(
        first: ${pageSize},
        after: ${cursor ? `"${cursor}"` : null},
        where: {orderby: {field: ${orderByField}, order: ${orderByType}}, stati: ${stati}}) {
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
              images {
                nodes {
                  sourceUrl
                  mediaDetails {
                    height
                    width
                  }
                  caption(format: RAW)
                  altText
                  description(format: RAW)
                }
              }
            }
            berlinerischWordTypes {
              nodes {
                name
              }
            }
            ${seo}
          }
          cursor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
    `)
      .then((res) => res.data)
      .catch((err) => {
        console.error("error: ", err);
      });

    allWords = [...allWords, ...data.berlinerWords.edges];
    cursor = data?.berlinerWords.pageInfo.endCursor;

    if (!data?.berlinerWords.pageInfo.hasNextPage) {
      break;
    }
  }

  return allWords as RootQueryToBerlinerWordConnectionEdge[];
};

export const fetchAllWords = async (
  orderByField = "TITLE",
  orderByType = "ASC",
  stati = SHOW_TEST_DATA ? ["DRAFT", "PUBLISH"] : ["PUBLISH"],
) => {
  let allWords: RootQueryToBerlinerWordConnectionEdge[] = [];
  let cursor = null;
  const pageSize = 100;
  const variables = {
    after: cursor,
    first: pageSize,
    field: orderByField,
    order: orderByType,
    stati,
  };

  while (true) {
    const response = await client.query(GetAllWordsDocument, variables).toPromise();

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
            images {
              nodes {
                sourceUrl
                mediaDetails {
                  height
                  width
                }
                caption(format: RAW)
                altText
                description(format: RAW)
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

export const getAllWordsLinks = async (
  orderByField = "TITLE",
  orderByType = "ASC",
): Promise<RootQueryToBerlinerWordConnectionEdge[]> => {
  let allWords: WordEdge[] = [];
  let cursor: string | null = null;
  const pageSize = 100;

  while (true) {
    const data: BerlinerWordsData = await fetchAPI(`
    {
      berlinerWords(first: ${pageSize}, after: ${
        cursor ? `"${cursor}"` : null
      }, where: {status: PUBLISH, orderby: {field: ${orderByField}, order: ${orderByType}}}) {
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
    `).then((res) => res.data);

    allWords = [...allWords, ...data.berlinerWords.edges];
    cursor = data?.berlinerWords.pageInfo.endCursor;

    if (!data?.berlinerWords.pageInfo.hasNextPage) {
      break;
    }
  }

  return allWords as RootQueryToBerlinerWordConnectionEdge[];
};
