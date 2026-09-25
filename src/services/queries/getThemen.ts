import { wpQuery } from "@services/wpGraphqlClient";

import type { GetAllBerlinerischThemenQuery } from "@/gql/graphql";

import { graphql } from "@/gql";

type ThemaNodes = NonNullable<GetAllBerlinerischThemenQuery["berlinerischThemen"]>["nodes"];

export const GetAllBerlinerischThemen = graphql(`
  query GetAllBerlinerischThemen {
    berlinerischThemen(first: 100) {
      nodes {
        name
        slug
        description
        count
        seo {
          ...TaxonomySeoFragment
        }
      }
    }
  }
`);

let _themenCache: Promise<ThemaNodes> | null = null;

export const fetchAllThemen = async () => {
  _themenCache ??= wpQuery(GetAllBerlinerischThemen, {}, "Fetching themen failed")
    .then((data) => data?.berlinerischThemen?.nodes ?? [])
    .catch((err: unknown) => {
      _themenCache = null;
      throw err;
    });
  return _themenCache;
};
