/**
 * WPGraphQL access for the importer. Field selections copy the queries of the former WPGraphQL site
 * (plus `databaseId` and `status`). Nothing here imports the Astro app.
 */

/** POST a query to WP_API with Basic Auth. Throws on HTTP and GraphQL errors. */
export async function wpGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { WP_API, WP_AUTH_USER, WP_AUTH_PASS } = process.env;
  if (!WP_API || !WP_AUTH_USER || !WP_AUTH_PASS) throw new Error("WP_API, WP_AUTH_USER and WP_AUTH_PASS must be set");
  const res = await fetch(WP_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${WP_AUTH_USER}:${WP_AUTH_PASS}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`WPGraphQL HTTP ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`WPGraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  if (!json.data) throw new Error("WPGraphQL returned no data");
  return json.data;
}

const POST_TYPE_SEO = `
  title canonical metaDesc opengraphTitle opengraphDescription
  opengraphImage { sourceUrl }
  twitterTitle twitterDescription metaRobotsNofollow metaRobotsNoindex`;

const MEDIA_ITEM = `audio { node { mediaItemUrl } } gender`;

export const WORDS_QUERY = `
  query ImportWords($after: String, $first: Int) {
    berlinerWords(first: $first, after: $after, where: { orderby: { field: TITLE, order: ASC }, stati: [DRAFT, PUBLISH] }) {
      nodes {
        databaseId status slug dateGmt modifiedGmt berlinerWordId
        wordProperties {
          article berlinerisch learnMore berolinismus infoText
          berlinerischAudio { ${MEDIA_ITEM} }
          examples { example exampleExplanation exampleAudio { ${MEDIA_ITEM} } }
          translations { translation }
          alternativeWords { alternativeWord }
          relatedWords { nodes { ... on BerlinerWord { databaseId slug } } }
          wikimediaFiles { wikimediaFile description caption }
          sources { quelle }
          images { nodes { sourceUrl caption(format: RENDERED) altText description(format: RENDERED) } }
        }
        berlinerischWordTypes { nodes { name } }
        berlinerischThemen { nodes { name slug } }
        seo { ${POST_TYPE_SEO} }
      }
      pageInfo { endCursor hasNextPage }
    }
  }`;

export const WORD_TYPES_QUERY = `
  query ImportWordTypes {
    berlinerischWordTypes(first: 100) { nodes { databaseId name slug } pageInfo { hasNextPage } }
  }`;

export const THEMEN_QUERY = `
  query ImportThemen {
    berlinerischThemen(first: 100) {
      nodes { databaseId name slug description seo { ${POST_TYPE_SEO} } }
      pageInfo { hasNextPage }
    }
  }`;

export const POSTS_QUERY = `
  query ImportPosts {
    posts(first: 100, where: { stati: [DRAFT, PUBLISH] }) {
      nodes {
        databaseId status slug title dateGmt modifiedGmt
        excerpt(format: RENDERED)
        featuredImage { node { sourceUrl altText } }
        blocks {
          name order saveContent
          ... on CoreImageBlock { attributes { ... on CoreImageBlockAttributes { url alt } } }
        }
        seo { ${POST_TYPE_SEO} }
      }
      pageInfo { hasNextPage }
    }
  }`;

export const PAGES_QUERY = `
  query ImportPages($slugs: [String]) {
    pages(where: { nameIn: $slugs }) { nodes { databaseId slug title content seo { ${POST_TYPE_SEO} } } }
  }`;

export const MENU_QUERY = `
  query ImportMenu($name: ID!) {
    menu(id: $name, idType: NAME) { menuItems(first: 100) { nodes { description label linkRelationship path } pageInfo { hasNextPage } } }
  }`;

export const AFFILIATE_QUERY = `
  query ImportAffiliate {
    affliate { affliateLinksFields {
      books { badge badgeModifier description href imageAlt imageUrl title }
      disclaimers { plattform text }
    } }
  }`;

export const COMPANY_QUERY = `
  query ImportCompany {
    company { companyInformations {
      funding { adresse link name }
      socialMedia { rel networkprofile networkname }
    } }
  }`;

export type Maybe<T> = T | null | undefined;
export type AudioRow = { gender?: Maybe<string>; audio?: Maybe<{ node?: Maybe<{ mediaItemUrl?: Maybe<string> }> }> };
type Nodes<T> = Maybe<{ nodes?: Maybe<Maybe<T>[]> }>;

export type WpSeo = {
  title?: Maybe<string>;
  canonical?: Maybe<string>;
  metaDesc?: Maybe<string>;
  opengraphTitle?: Maybe<string>;
  opengraphDescription?: Maybe<string>;
  opengraphImage?: Maybe<{ sourceUrl?: Maybe<string> }>;
  twitterTitle?: Maybe<string>;
  twitterDescription?: Maybe<string>;
  metaRobotsNofollow?: Maybe<string>;
  metaRobotsNoindex?: Maybe<string>;
};

export type WpImage = { sourceUrl?: Maybe<string>; altText?: Maybe<string>; caption?: Maybe<string>; description?: Maybe<string> };

export type WpWord = {
  databaseId: number;
  status?: Maybe<string>;
  slug?: Maybe<string>;
  dateGmt?: Maybe<string>;
  modifiedGmt?: Maybe<string>;
  berlinerWordId?: Maybe<number>;
  wordProperties?: Maybe<{
    article?: Maybe<string>;
    berlinerisch?: Maybe<string>;
    learnMore?: Maybe<string>;
    berolinismus?: Maybe<boolean>;
    infoText?: Maybe<string>;
    berlinerischAudio?: Maybe<Maybe<AudioRow>[]>;
    examples?: Maybe<Maybe<{ example?: Maybe<string>; exampleExplanation?: Maybe<string>; exampleAudio?: Maybe<Maybe<AudioRow>[]> }>[]>;
    translations?: Maybe<Maybe<{ translation?: Maybe<string> }>[]>;
    alternativeWords?: Maybe<Maybe<{ alternativeWord?: Maybe<string> }>[]>;
    relatedWords?: Nodes<{ databaseId?: Maybe<number>; slug?: Maybe<string> }>;
    wikimediaFiles?: Maybe<Maybe<{ wikimediaFile?: Maybe<string>; description?: Maybe<string>; caption?: Maybe<string> }>[]>;
    sources?: Maybe<Maybe<{ quelle?: Maybe<string | Maybe<string>[]> }>[]>;
    images?: Nodes<WpImage>;
  }>;
  berlinerischWordTypes?: Nodes<{ name?: Maybe<string> }>;
  berlinerischThemen?: Nodes<{ name?: Maybe<string>; slug?: Maybe<string> }>;
  seo?: Maybe<WpSeo>;
};

export type WpBlock = {
  name?: Maybe<string>;
  order?: Maybe<number>;
  saveContent?: Maybe<string>;
  attributes?: Maybe<{ url?: Maybe<string>; alt?: Maybe<string> }>;
};

export type WpPost = {
  databaseId: number;
  status?: Maybe<string>;
  slug?: Maybe<string>;
  title?: Maybe<string>;
  dateGmt?: Maybe<string>;
  modifiedGmt?: Maybe<string>;
  excerpt?: Maybe<string>;
  featuredImage?: Maybe<{ node?: Maybe<WpImage> }>;
  blocks?: Maybe<Maybe<WpBlock>[]>;
  seo?: Maybe<WpSeo>;
};

export type WpPage = { databaseId: number; slug?: Maybe<string>; title?: Maybe<string>; content?: Maybe<string>; seo?: Maybe<WpSeo> };
export type WpThema = { databaseId: number; name?: Maybe<string>; slug?: Maybe<string>; description?: Maybe<string>; seo?: Maybe<WpSeo> };
export type WpWordType = { databaseId: number; name?: Maybe<string>; slug?: Maybe<string> };
