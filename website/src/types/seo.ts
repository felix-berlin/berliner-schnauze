export interface Seo {
  canonical?: string;
  metaDesc?: string;
  opengraphDescription?: string;
  opengraphImage?: {
    alt?: string;
    height?: string;
    sourceUrl: string;
    type?: string;
    width?: string;
  };
  opengraphModifiedTime?: string;
  opengraphPublishedTime?: string;
  opengraphSiteName?: string;
  opengraphTitle?: string;
  opengraphType?: string;
  opengraphUrl?: string;
  readingTime?: number;
  /** `noindex`/`nofollow` from the CMS SEO fields; unset means the default (index, follow). */
  robots?: string;
  title?: string;
  twitterDescription?: string;
  twitterTitle?: string;
}

export interface Title {
  title: string;
}

export interface SeoProps {
  seo: Seo;
  title: Title;
}
