// Content shapes the components read, produced by the Payload adapters in src/services/payload/.
// They mirror what the WPGraphQL queries returned, so pages and components stay as they are.

export type AudioRow = {
  gender: string | null;
  audio: { node: { mediaItemUrl: string | null } } | null;
};

export type WordImage = {
  altText: string | null;
  /** HTML (escaped plain text). */
  caption: string | null;
  /** HTML rendered from rich text. */
  description: string | null;
  mediaDetails: { height: number | null; width: number | null } | null;
  sourceUrl: string | null;
};

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

/** Stored on save in Payload (see payload-app `deriveWordFields`). */
export type WordDerived = {
  characterLength: number | null;
  consonantsCount: number | null;
  nlpTags: unknown;
  soundexCode: string | null;
  syllablesCount: number | null;
  vowelsCount: number | null;
  wordComponents: string[] | null;
  wordGroup: string | null;
};

export type WordProperties = {
  alternativeWords: { alternativeWord: string | null }[] | null;
  article: string | null;
  berlinerisch: string;
  berlinerischAudio: AudioRow[] | null;
  berolinismus: boolean | null;
  examples:
    | {
        example: string | null;
        exampleAudio: AudioRow[] | null;
        exampleExplanation: string | null;
      }[]
    | null;
  /** HTML rendered from rich text. */
  infoText: string | null;
  images: { nodes: WordImage[] } | null;
  learnMore: string | null;
  relatedWords: {
    nodes: {
      id: string;
      slug: string | null;
      wordProperties: { berlinerisch: string | null } | null;
    }[];
  } | null;
  sources: { quelle: (string | null)[] | null }[] | null;
  translations: { translation: string | null }[] | null;
  wikimediaFiles:
    | { caption: string | null; description: string | null; wikimediaFile: string | null }[]
    | null;
};

export type Word = {
  berlinerischThemen: { nodes: { name: string | null; slug: string | null }[] } | null;
  berlinerischWordTypes: { nodes: { name: string | null }[] } | null;
  berlinerWordId: number;
  /** WP format: ISO without milliseconds and without a trailing Z. */
  dateGmt: string | null;
  derived: WordDerived | null;
  id: string;
  modifiedGmt: string | null;
  seo: SeoData | null;
  slug: string;
  title: string | null;
  /** Flattened, non-empty `wordProperties.translations`. */
  translations: string[];
  wordGroup: string | null;
  wordProperties: WordProperties;
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

// Names the components used to import from the generated GraphQL types.
export type Maybe<T> = T | null;
export type BerlinerWord = Word;
export type MediaItem = { mediaItemUrl: string | null };
export type WordPropertiesBerlinerischAudio = AudioRow;
export type WordPropertiesExamplesExampleAudio = AudioRow;
export type WordPropertiesExamples = NonNullable<WordProperties["examples"]>[number];
export type WordPropertiesWikimediaFiles = NonNullable<WordProperties["wikimediaFiles"]>[number];
