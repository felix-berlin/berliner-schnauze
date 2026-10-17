export interface Seo {
  canonical?: string;
  metaDesc?: string;
  metaRobotsNofollow?: string;
  metaRobotsNoindex?: string;
  opengraphAuthor?: string;
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
  opengraphPublisher?: string;
  opengraphSiteName?: string;
  opengraphTitle?: string;
  opengraphType?: string;
  opengraphUrl?: string;
  readingTime?: number;
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
