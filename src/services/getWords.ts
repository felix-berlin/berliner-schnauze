import { fetchAPI } from "@services/fetchApi.ts";
import { seo } from "@services/graphQlQueryParts.ts";
import type {
  RootQueryToBerlinerWordConnection,
  RootQueryToBerlinerWordConnectionEdge,
  BerlinerWord,
} from "@ts_types/generated/graphql.ts";
import { SHOW_TEST_DATA } from "astro:env/client";

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

export const getWordsWithSlugs = async (): Promise<WordEdge[]> => {
  let allWords: WordEdge[] = [];
  let cursor: string | null = null;
  const pageSize = 100;

  while (true) {
    const data: BerlinerWordsData = await fetchAPI(`
    {
      berlinerWords(first: ${pageSize}, after: ${
        cursor ? `"${cursor}"` : null
      }, where: {status: PUBLISH}) {
        edges {
          node {
            slug
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

  return allWords;
};

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

export const getWordBySlug = async (slug: string): Promise<BerlinerWord> => {
  const data = await fetchAPI(`
  {
    berlinerWord(id: "${slug}", idType: URI) {
      slug
      title
      ${seo}
    }
  }
  `).then((res) => res.data);

  return data?.berlinerWord;
};
