import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { WP_API } from "astro:env/client";

import type { AffiliateQuery } from "@/gql/graphql.ts";

import { graphql } from "@/gql";
import { AffiliateDocument } from "@/gql/graphql.ts";

const client = new Client({
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: { headers: { "Content-Type": "application/json" } },
  url: WP_API,
});

type AffliateLinksFields = NonNullable<
  NonNullable<AffiliateQuery["affliate"]>["affliateLinksFields"]
>;

export type AffiliateBook = NonNullable<NonNullable<AffliateLinksFields["books"]>[number]>;
export type AffiliateDisclaimer = NonNullable<NonNullable<AffliateLinksFields["disclaimers"]>[number]>;

export interface AffiliateData {
  books: AffiliateBook[];
  disclaimers: AffiliateDisclaimer[];
}

export const fetchAffiliateData = async (): Promise<AffiliateData> => {
  const response = await client.query(AffiliateDocument, {}).toPromise();

  if (response.error) {
    console.error("Error fetching affiliate data:", response.error);
    return { books: [], disclaimers: [] };
  }

  const fields = response.data?.affliate?.affliateLinksFields;
  const books = (fields?.books ?? []).filter((b): b is AffiliateBook => b !== null);
  const disclaimers = (fields?.disclaimers ?? []).filter((d): d is AffiliateDisclaimer => d !== null);

  return { books, disclaimers };
};

export const Affiliate = graphql(`
  query Affiliate {
    affliate {
      affliateLinksFields {
        books {
          badge
          badgeModifier
          description
          href
          imageAlt
          imageUrl
          title
        }
        disclaimers {
          plattform
          text
        }
      }
    }
  }
`);
