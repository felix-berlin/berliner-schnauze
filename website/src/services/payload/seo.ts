import type { SeoMetaGroup } from "payload-app";

import { mediaUrl } from "@services/payload.ts";

import type { Seo } from "@/types/seo.ts";

const SITE_NAME = "Berliner Schnauze";

/**
 * SEO plugin `meta` group -> the head props of `BaseHead` (`Seo`); empty values are left out. The description is
 * also og:description (BaseHead renders the meta description from it). og:type is
 * "article" for words and posts, pages and themen set their own.
 */
export const metaToSeo = (meta: SeoMetaGroup | null | undefined, opengraphType?: string): Seo => {
  if (!meta) return {};
  const image = mediaUrl(meta.image);
  return {
    ...(meta.canonical && { canonical: meta.canonical }),
    ...(meta.description && { metaDesc: meta.description, opengraphDescription: meta.description }),
    ...(image && { opengraphImage: { sourceUrl: image } }),
    opengraphSiteName: SITE_NAME,
    ...(opengraphType && { opengraphType }),
    ...(meta.title && { title: meta.title }),
  };
};
