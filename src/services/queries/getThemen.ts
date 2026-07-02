import { graphql } from "@/gql";
import type { GetAllBerlinerischThemenQuery } from "@/gql/graphql";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

type ThemaNodes = NonNullable<
  GetAllBerlinerischThemenQuery["berlinerischThemen"]
>["nodes"];

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
  _themenCache ??= wpGraphqlClient
    .query(GetAllBerlinerischThemen, {})
    .toPromise()
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.berlinerischThemen?.nodes ?? [];
    })
    .catch((err: unknown) => {
      _themenCache = null;
      throw err;
    });
  return _themenCache;
};
