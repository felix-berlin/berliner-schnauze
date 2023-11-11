import { fetchAPI } from "@services/fetchApi";
import type { RootQueryToBerlinerWordConnection, BerlinerWord } from "@ts_types/generated/graphql";

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

    allWords = [...allWords, ...data?.berlinerWords.edges];
    cursor = data?.berlinerWords.pageInfo.endCursor;

    if (!data?.berlinerWords.pageInfo.hasNextPage) {
      break;
    }
  }

  return allWords;
};

export const getWordBySlug = async (slug: string): Promise<BerlinerWord> => {
  const data = await fetchAPI(`
  {
    berlinerWord(id: "${slug}", idType: URI) {
      slug
      title
      seo {
        title
        readingTime
        canonical
        metaDesc
        opengraphSiteName
        opengraphAuthor
        opengraphDescription
        opengraphPublisher
        opengraphTitle
        opengraphType
        opengraphUrl
        opengraphPublishedTime
        opengraphModifiedTime
        opengraphImage {
          sourceUrl
        }
        twitterDescription
        twitterTitle
        metaRobotsNofollow
        metaRobotsNoindex
      }
    }
  }
  `).then((res) => res.data);
  console.log("data", data);

  return data?.berlinerWord;
};
