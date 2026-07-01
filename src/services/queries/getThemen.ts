import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { WP_API } from "astro:env/client";

import { graphql } from "@/gql";
import type { GetAllBerlinerischThemenQuery } from "@/gql/graphql";


type ThemaNodes = NonNullable<
  GetAllBerlinerischThemenQuery["berlinerischThemen"]
>["nodes"];

const client = new Client({
  exchanges: [cacheExchange, fetchExchange],
  url: WP_API,
});

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
  _themenCache ??= client
    .query(GetAllBerlinerischThemen, {})
    .toPromise()
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.berlinerischThemen?.nodes ?? [];
    });
  return _themenCache;
};
