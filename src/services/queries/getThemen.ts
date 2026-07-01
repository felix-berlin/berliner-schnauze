import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { WP_API } from "astro:env/client";

import { graphql } from "@/gql";

import { TaxonomySeoFragment } from "@services/fragments/fragments";

const client = new Client({
  url: WP_API,
  exchanges: [cacheExchange, fetchExchange],
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

let _themenCache: ReturnType<typeof fetchAllThemen> | null = null;

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
