// Content shapes still in the WPGraphQL form, produced by the Payload adapters in src/services/payload/.
// Words read the generated Payload types (`SiteWord` in services/payload/words.ts); the rest follows.

export type SeoData = {
  canonical: string | null;
  metaDesc: string | null;
  metaRobotsNofollow: string | null;
  metaRobotsNoindex: string | null;
  opengraphDescription: string | null;
  opengraphImage: { sourceUrl: string | null } | null;
  opengraphSiteName: string | null;
  opengraphTitle: string | null;
  opengraphType: string | null;
  readingTime: number | null;
  title: string | null;
  twitterDescription: string | null;
  twitterTitle: string | null;
};

export type ThemaNode = {
  count: number;
  description: string | null;
  name: string;
  seo: SeoData | null;
  slug: string;
};

export type CoreImageBlock = {
  attributes: { alt: string; height: string; url: string; width: string } | null;
  name: "core/image";
  order: number;
  saveContent: string | null;
};

export type CoreQuoteBlock = {
  attributes: { value: string } | null;
  name: "core/quote";
  order: number;
  saveContent: string | null;
};

export type HtmlBlock = {
  attributes?: undefined;
  name: "core/html";
  order: number;
  saveContent: string | null;
};

export type ArticleBlock = CoreImageBlock | CoreQuoteBlock | HtmlBlock;

export type PostNode = {
  blocks: ArticleBlock[];
  /** WP `date`: local (Berlin) time of the site, no zone. */
  date: string | null;
  excerpt: string | null;
  featuredImage: { node: { altText: string | null; sourceUrl: string | null } } | null;
  id: string;
  /** WP format (UTC, no trailing Z). */
  modifiedGmt: string | null;
  seo: SeoData | null;
  slug: string | null;
  title: string | null;
};

export type PageNode = {
  /** HTML rendered from rich text. */
  content: string;
  seo: SeoData | null;
  slug: string;
  title: string;
};

export type AffiliateBook = {
  badge: string | null;
  badgeModifier: string | null;
  description: string | null;
  href: string | null;
  imageAlt: string | null;
  imageUrl: string | null;
  title: string | null;
};

export type AffiliateDisclaimer = { plattform: string | null; text: string | null };
