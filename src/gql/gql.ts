/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

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
    "\n  fragment TaxonomySeoFragment on TaxonomySEO {\n    title\n    metaDesc\n    canonical\n    opengraphDescription\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n": typeof types.TaxonomySeoFragmentFragmentDoc,
    "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    readingTime\n    canonical\n    metaDesc\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n": typeof types.PostTypeSeoFragmentFragmentDoc,
    "\n  fragment MediaItem on MediaItem {\n    mediaItemUrl\n  }\n": typeof types.MediaItemFragmentDoc,
    "\n  fragment WordPropertiesBerlinerischAudio on WordPropertiesBerlinerischAudio {\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n    gender\n  }\n": typeof types.WordPropertiesBerlinerischAudioFragmentDoc,
    "\n  fragment WordPropertiesExamplesExampleAudio on WordPropertiesExamplesExampleAudio {\n    gender\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n  }\n": typeof types.WordPropertiesExamplesExampleAudioFragmentDoc,
    "\n  fragment WordPropertiesExamples on WordPropertiesExamples {\n    example\n    exampleExplanation\n    exampleAudio {\n      ...WordPropertiesExamplesExampleAudio\n    }\n  }\n": typeof types.WordPropertiesExamplesFragmentDoc,
    "\n  fragment WordPropertiesWikimediaFiles on WordPropertiesWikimediaFiles {\n    wikimediaFile\n    description\n    caption\n  }\n": typeof types.WordPropertiesWikimediaFilesFragmentDoc,
    "\n  fragment WordProperties on WordProperties {\n    article\n    berlinerisch\n    berlinerischAudio {\n      ...WordPropertiesBerlinerischAudio\n    }\n    learnMore\n    berolinismus\n    examples {\n      ...WordPropertiesExamples\n    }\n    translations {\n      translation\n    }\n    alternativeWords {\n      alternativeWord\n    }\n    relatedWords {\n      nodes {\n        ... on BerlinerWord {\n          id\n          wordProperties {\n            berlinerisch\n          }\n          slug\n        }\n      }\n    }\n    wikimediaFiles {\n      ...WordPropertiesWikimediaFiles\n    }\n    infoText\n    sources {\n      quelle\n    }\n    images {\n      nodes {\n        sourceUrl\n        mediaDetails {\n          height\n          width\n        }\n        caption(format: RENDERED)\n        altText\n        description(format: RENDERED)\n      }\n    }\n  }\n": typeof types.WordPropertiesFragmentDoc,
    "\n  fragment BerlinerWord on BerlinerWord {\n    id\n    slug\n    title\n    wordGroup\n    dateGmt\n    modifiedGmt\n    berlinerWordId\n    wordProperties {\n      ...WordProperties\n    }\n    berlinerischWordTypes {\n      nodes {\n        name\n      }\n    }\n    berlinerischThemen {\n      nodes {\n        name\n        slug\n      }\n    }\n    seo {\n      ...PostTypeSeoFragment\n    }\n  }\n": typeof types.BerlinerWordFragmentDoc,
    "\n  mutation SendEmail($input: SendEmailInput = {}) {\n    sendEmail(input: $input) {\n      message\n      origin\n      sent\n    }\n  }\n": typeof types.SendEmailDocument,
    "\n  query Affiliate {\n    affliate {\n      affliateLinksFields {\n        books {\n          badge\n          badgeModifier\n          description\n          href\n          imageAlt\n          imageUrl\n          title\n        }\n        disclaimers {\n          plattform\n          text\n        }\n      }\n    }\n  }\n": typeof types.AffiliateDocument,
    "\n  query CompanyFunding {\n    company {\n      companyInformations {\n        funding {\n          adresse\n          link\n          name\n        }\n      }\n    }\n  }\n": typeof types.CompanyFundingDocument,
    "\n  query CompanySocialMedia {\n    company {\n      companyInformations {\n        socialMedia {\n          rel\n          networkprofile\n          networkname\n        }\n      }\n    }\n  }\n": typeof types.CompanySocialMediaDocument,
    "\n  query MenuByName($name: ID!) {\n    menu(id: $name, idType: NAME) {\n      menuItems(first: 100) {\n        nodes {\n          label\n          linkRelationship\n          path\n        }\n      }\n    }\n  }\n": typeof types.MenuByNameDocument,
    "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n": typeof types.GetPagesBySlugsDocument,
    "\n  query GetAllBerlinerischThemen {\n    berlinerischThemen(first: 100) {\n      nodes {\n        name\n        slug\n        description\n        count\n        seo {\n          ...TaxonomySeoFragment\n        }\n      }\n    }\n  }\n": typeof types.GetAllBerlinerischThemenDocument,
    "\n  query GetAllWords(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          ...BerlinerWord\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": typeof types.GetAllWordsDocument,
    "\n  query GetAllWordsLinks(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          slug\n          wordGroup\n          wordProperties {\n            berlinerisch\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": typeof types.GetAllWordsLinksDocument,
};
const documents: Documents = {
    "\n  fragment TaxonomySeoFragment on TaxonomySEO {\n    title\n    metaDesc\n    canonical\n    opengraphDescription\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n": types.TaxonomySeoFragmentFragmentDoc,
    "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    readingTime\n    canonical\n    metaDesc\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n": types.PostTypeSeoFragmentFragmentDoc,
    "\n  fragment MediaItem on MediaItem {\n    mediaItemUrl\n  }\n": types.MediaItemFragmentDoc,
    "\n  fragment WordPropertiesBerlinerischAudio on WordPropertiesBerlinerischAudio {\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n    gender\n  }\n": types.WordPropertiesBerlinerischAudioFragmentDoc,
    "\n  fragment WordPropertiesExamplesExampleAudio on WordPropertiesExamplesExampleAudio {\n    gender\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n  }\n": types.WordPropertiesExamplesExampleAudioFragmentDoc,
    "\n  fragment WordPropertiesExamples on WordPropertiesExamples {\n    example\n    exampleExplanation\n    exampleAudio {\n      ...WordPropertiesExamplesExampleAudio\n    }\n  }\n": types.WordPropertiesExamplesFragmentDoc,
    "\n  fragment WordPropertiesWikimediaFiles on WordPropertiesWikimediaFiles {\n    wikimediaFile\n    description\n    caption\n  }\n": types.WordPropertiesWikimediaFilesFragmentDoc,
    "\n  fragment WordProperties on WordProperties {\n    article\n    berlinerisch\n    berlinerischAudio {\n      ...WordPropertiesBerlinerischAudio\n    }\n    learnMore\n    berolinismus\n    examples {\n      ...WordPropertiesExamples\n    }\n    translations {\n      translation\n    }\n    alternativeWords {\n      alternativeWord\n    }\n    relatedWords {\n      nodes {\n        ... on BerlinerWord {\n          id\n          wordProperties {\n            berlinerisch\n          }\n          slug\n        }\n      }\n    }\n    wikimediaFiles {\n      ...WordPropertiesWikimediaFiles\n    }\n    infoText\n    sources {\n      quelle\n    }\n    images {\n      nodes {\n        sourceUrl\n        mediaDetails {\n          height\n          width\n        }\n        caption(format: RENDERED)\n        altText\n        description(format: RENDERED)\n      }\n    }\n  }\n": types.WordPropertiesFragmentDoc,
    "\n  fragment BerlinerWord on BerlinerWord {\n    id\n    slug\n    title\n    wordGroup\n    dateGmt\n    modifiedGmt\n    berlinerWordId\n    wordProperties {\n      ...WordProperties\n    }\n    berlinerischWordTypes {\n      nodes {\n        name\n      }\n    }\n    berlinerischThemen {\n      nodes {\n        name\n        slug\n      }\n    }\n    seo {\n      ...PostTypeSeoFragment\n    }\n  }\n": types.BerlinerWordFragmentDoc,
    "\n  mutation SendEmail($input: SendEmailInput = {}) {\n    sendEmail(input: $input) {\n      message\n      origin\n      sent\n    }\n  }\n": types.SendEmailDocument,
    "\n  query Affiliate {\n    affliate {\n      affliateLinksFields {\n        books {\n          badge\n          badgeModifier\n          description\n          href\n          imageAlt\n          imageUrl\n          title\n        }\n        disclaimers {\n          plattform\n          text\n        }\n      }\n    }\n  }\n": types.AffiliateDocument,
    "\n  query CompanyFunding {\n    company {\n      companyInformations {\n        funding {\n          adresse\n          link\n          name\n        }\n      }\n    }\n  }\n": types.CompanyFundingDocument,
    "\n  query CompanySocialMedia {\n    company {\n      companyInformations {\n        socialMedia {\n          rel\n          networkprofile\n          networkname\n        }\n      }\n    }\n  }\n": types.CompanySocialMediaDocument,
    "\n  query MenuByName($name: ID!) {\n    menu(id: $name, idType: NAME) {\n      menuItems(first: 100) {\n        nodes {\n          label\n          linkRelationship\n          path\n        }\n      }\n    }\n  }\n": types.MenuByNameDocument,
    "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n": types.GetPagesBySlugsDocument,
    "\n  query GetAllBerlinerischThemen {\n    berlinerischThemen(first: 100) {\n      nodes {\n        name\n        slug\n        description\n        count\n        seo {\n          ...TaxonomySeoFragment\n        }\n      }\n    }\n  }\n": types.GetAllBerlinerischThemenDocument,
    "\n  query GetAllWords(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          ...BerlinerWord\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": types.GetAllWordsDocument,
    "\n  query GetAllWordsLinks(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          slug\n          wordGroup\n          wordProperties {\n            berlinerisch\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": types.GetAllWordsLinksDocument,
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
export function graphql(source: "\n  fragment TaxonomySeoFragment on TaxonomySEO {\n    title\n    metaDesc\n    canonical\n    opengraphDescription\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n"): (typeof documents)["\n  fragment TaxonomySeoFragment on TaxonomySEO {\n    title\n    metaDesc\n    canonical\n    opengraphDescription\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    readingTime\n    canonical\n    metaDesc\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n"): (typeof documents)["\n  fragment PostTypeSeoFragment on PostTypeSEO {\n    title\n    readingTime\n    canonical\n    metaDesc\n    opengraphSiteName\n    opengraphAuthor\n    opengraphDescription\n    opengraphPublisher\n    opengraphTitle\n    opengraphType\n    opengraphUrl\n    opengraphPublishedTime\n    opengraphModifiedTime\n    opengraphImage {\n      sourceUrl\n    }\n    twitterDescription\n    twitterTitle\n    metaRobotsNofollow\n    metaRobotsNoindex\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment MediaItem on MediaItem {\n    mediaItemUrl\n  }\n"): (typeof documents)["\n  fragment MediaItem on MediaItem {\n    mediaItemUrl\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WordPropertiesBerlinerischAudio on WordPropertiesBerlinerischAudio {\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n    gender\n  }\n"): (typeof documents)["\n  fragment WordPropertiesBerlinerischAudio on WordPropertiesBerlinerischAudio {\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n    gender\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WordPropertiesExamplesExampleAudio on WordPropertiesExamplesExampleAudio {\n    gender\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment WordPropertiesExamplesExampleAudio on WordPropertiesExamplesExampleAudio {\n    gender\n    audio {\n      node {\n        ...MediaItem\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WordPropertiesExamples on WordPropertiesExamples {\n    example\n    exampleExplanation\n    exampleAudio {\n      ...WordPropertiesExamplesExampleAudio\n    }\n  }\n"): (typeof documents)["\n  fragment WordPropertiesExamples on WordPropertiesExamples {\n    example\n    exampleExplanation\n    exampleAudio {\n      ...WordPropertiesExamplesExampleAudio\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WordPropertiesWikimediaFiles on WordPropertiesWikimediaFiles {\n    wikimediaFile\n    description\n    caption\n  }\n"): (typeof documents)["\n  fragment WordPropertiesWikimediaFiles on WordPropertiesWikimediaFiles {\n    wikimediaFile\n    description\n    caption\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WordProperties on WordProperties {\n    article\n    berlinerisch\n    berlinerischAudio {\n      ...WordPropertiesBerlinerischAudio\n    }\n    learnMore\n    berolinismus\n    examples {\n      ...WordPropertiesExamples\n    }\n    translations {\n      translation\n    }\n    alternativeWords {\n      alternativeWord\n    }\n    relatedWords {\n      nodes {\n        ... on BerlinerWord {\n          id\n          wordProperties {\n            berlinerisch\n          }\n          slug\n        }\n      }\n    }\n    wikimediaFiles {\n      ...WordPropertiesWikimediaFiles\n    }\n    infoText\n    sources {\n      quelle\n    }\n    images {\n      nodes {\n        sourceUrl\n        mediaDetails {\n          height\n          width\n        }\n        caption(format: RENDERED)\n        altText\n        description(format: RENDERED)\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment WordProperties on WordProperties {\n    article\n    berlinerisch\n    berlinerischAudio {\n      ...WordPropertiesBerlinerischAudio\n    }\n    learnMore\n    berolinismus\n    examples {\n      ...WordPropertiesExamples\n    }\n    translations {\n      translation\n    }\n    alternativeWords {\n      alternativeWord\n    }\n    relatedWords {\n      nodes {\n        ... on BerlinerWord {\n          id\n          wordProperties {\n            berlinerisch\n          }\n          slug\n        }\n      }\n    }\n    wikimediaFiles {\n      ...WordPropertiesWikimediaFiles\n    }\n    infoText\n    sources {\n      quelle\n    }\n    images {\n      nodes {\n        sourceUrl\n        mediaDetails {\n          height\n          width\n        }\n        caption(format: RENDERED)\n        altText\n        description(format: RENDERED)\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BerlinerWord on BerlinerWord {\n    id\n    slug\n    title\n    wordGroup\n    dateGmt\n    modifiedGmt\n    berlinerWordId\n    wordProperties {\n      ...WordProperties\n    }\n    berlinerischWordTypes {\n      nodes {\n        name\n      }\n    }\n    berlinerischThemen {\n      nodes {\n        name\n        slug\n      }\n    }\n    seo {\n      ...PostTypeSeoFragment\n    }\n  }\n"): (typeof documents)["\n  fragment BerlinerWord on BerlinerWord {\n    id\n    slug\n    title\n    wordGroup\n    dateGmt\n    modifiedGmt\n    berlinerWordId\n    wordProperties {\n      ...WordProperties\n    }\n    berlinerischWordTypes {\n      nodes {\n        name\n      }\n    }\n    berlinerischThemen {\n      nodes {\n        name\n        slug\n      }\n    }\n    seo {\n      ...PostTypeSeoFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendEmail($input: SendEmailInput = {}) {\n    sendEmail(input: $input) {\n      message\n      origin\n      sent\n    }\n  }\n"): (typeof documents)["\n  mutation SendEmail($input: SendEmailInput = {}) {\n    sendEmail(input: $input) {\n      message\n      origin\n      sent\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Affiliate {\n    affliate {\n      affliateLinksFields {\n        books {\n          badge\n          badgeModifier\n          description\n          href\n          imageAlt\n          imageUrl\n          title\n        }\n        disclaimers {\n          plattform\n          text\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Affiliate {\n    affliate {\n      affliateLinksFields {\n        books {\n          badge\n          badgeModifier\n          description\n          href\n          imageAlt\n          imageUrl\n          title\n        }\n        disclaimers {\n          plattform\n          text\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompanyFunding {\n    company {\n      companyInformations {\n        funding {\n          adresse\n          link\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CompanyFunding {\n    company {\n      companyInformations {\n        funding {\n          adresse\n          link\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompanySocialMedia {\n    company {\n      companyInformations {\n        socialMedia {\n          rel\n          networkprofile\n          networkname\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CompanySocialMedia {\n    company {\n      companyInformations {\n        socialMedia {\n          rel\n          networkprofile\n          networkname\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MenuByName($name: ID!) {\n    menu(id: $name, idType: NAME) {\n      menuItems(first: 100) {\n        nodes {\n          label\n          linkRelationship\n          path\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query MenuByName($name: ID!) {\n    menu(id: $name, idType: NAME) {\n      menuItems(first: 100) {\n        nodes {\n          label\n          linkRelationship\n          path\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPagesBySlugs($slugs: [String] = []) {\n    pages(where: { nameIn: $slugs }) {\n      nodes {\n        slug\n        title\n        content\n        seo {\n          ...PostTypeSeoFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetAllBerlinerischThemen {\n    berlinerischThemen(first: 100) {\n      nodes {\n        name\n        slug\n        description\n        count\n        seo {\n          ...TaxonomySeoFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetAllBerlinerischThemen {\n    berlinerischThemen(first: 100) {\n      nodes {\n        name\n        slug\n        description\n        count\n        seo {\n          ...TaxonomySeoFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetAllWords(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          ...BerlinerWord\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetAllWords(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          ...BerlinerWord\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetAllWordsLinks(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          slug\n          wordGroup\n          wordProperties {\n            berlinerisch\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetAllWordsLinks(\n    $after: String = \"\"\n    $first: Int = 100\n    $field: PostObjectsConnectionOrderbyEnum = TITLE\n    $order: OrderEnum = ASC\n    $stati: [PostStatusEnum] = PUBLISH\n  ) {\n    berlinerWords(\n      first: $first\n      after: $after\n      where: { orderby: { field: $field, order: $order }, stati: $stati }\n    ) {\n      edges {\n        node {\n          slug\n          wordGroup\n          wordProperties {\n            berlinerisch\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;