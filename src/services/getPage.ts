import { graphql } from "@/gql";

export const GetPagesBySlugs = graphql(`
  query GetPagesBySlugs($slugs: [String] = []) {
    pages(where: { nameIn: $slugs }) {
      nodes {
        slug
        title
        content
        seo {
          ...PostTypeSeoFragment
        }
      }
    }
  }
`);
