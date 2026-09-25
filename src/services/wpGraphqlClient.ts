import type { AnyVariables, DocumentInput } from "@urql/core";

import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { WP_API } from "astro:env/client";
import { WP_AUTH_PASS, WP_AUTH_USER } from "astro:env/server";

/**
 * Shared, authenticated urql Client for build-time WPGraphQL requests.
 * WPGraphQL requires authentication for all requests — this sends HTTP Basic Auth
 * using an Application Password (WP core, no plugin needed).
 * See docs/superpowers/plans/2026-07-02-graphql-auth-cloudflare-build.md
 */
export const wpGraphqlClient = new Client({
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: {
    headers: {
      Authorization: `Basic ${Buffer.from(`${WP_AUTH_USER}:${WP_AUTH_PASS}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  },
  url: WP_API,
});

/** Runs a build-time WPGraphQL query, returning `data` and throwing on any GraphQL/network error. */
export const wpQuery = async <Data, Variables extends AnyVariables>(
  document: DocumentInput<Data, Variables>,
  variables: Variables,
  errorMessage = "WPGraphQL query failed",
): Promise<Data | undefined> => {
  const { data, error } = await wpGraphqlClient.query(document, variables).toPromise();
  if (error) throw new Error(`${errorMessage}: ${error.message}`, { cause: error });
  return data;
};
