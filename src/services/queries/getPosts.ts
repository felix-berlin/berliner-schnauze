import { wpGraphqlClient } from "@services/wpGraphqlClient";

import type { GetAllPostsQuery } from "@/gql/graphql";

import { graphql } from "@/gql";

export type PostNodes = NonNullable<GetAllPostsQuery["posts"]>["nodes"];

export const GetAllPosts = graphql(`
  query GetAllPosts {
    posts(first: 100, where: { status: PUBLISH }) {
      nodes {
        id
        slug
        title
        date
        excerpt(format: RENDERED)
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        blocks {
          name
          order
          saveContent
          ...CoreImageBlockFields
          ...CoreQuoteBlockFields
        }
        seo {
          ...PostTypeSeoFragment
        }
      }
    }
  }
`);

let _postsCache: Promise<PostNodes> | null = null;

export const fetchAllPosts = async () => {
  _postsCache ??= wpGraphqlClient
    .query(GetAllPosts, {})
    .toPromise()
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.posts?.nodes ?? [];
    })
    .catch((err: unknown) => {
      _postsCache = null;
      throw err;
    });
  return _postsCache;
};
