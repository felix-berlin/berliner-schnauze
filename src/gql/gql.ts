/* eslint-disable */
import * as types from "./graphql";
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    canonical\n    metaDesc\n    metaRobotsNofollow\n    metaRobotsNoindex\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n  }\n": typeof types.PostTypeSeoFragmentFragmentDoc;
  "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n": typeof types.GetPagesBySlugsDocument;
};
const documents: Documents = {
  "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    canonical\n    metaDesc\n    metaRobotsNofollow\n    metaRobotsNoindex\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n  }\n":
    types.PostTypeSeoFragmentFragmentDoc,
  "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n":
    types.GetPagesBySlugsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    canonical\n    metaDesc\n    metaRobotsNofollow\n    metaRobotsNoindex\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n  }\n",
): (typeof documents)["\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    canonical\n    metaDesc\n    metaRobotsNofollow\n    metaRobotsNoindex\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n",
): (typeof documents)["\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
