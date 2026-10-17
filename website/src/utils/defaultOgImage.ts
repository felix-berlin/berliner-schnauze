import { mediaFileUrl } from "@services/payload.ts";
import { getImage } from "astro:assets";
import { SITE_URL } from "astro:env/client";

import type { Seo } from "@/types/seo.ts";

/** The roaring bear artwork (a CMS media file): the home page hero and the share image of pages without their own. */
export const BROWN_BEAR_ROAR = {
  height: 517,
  src: mediaFileUrl("brown-bear-roar.png"),
  width: 900,
} as const;

/** og:image of a page without its own: the bear artwork as png. */
export const defaultOgImage = async (alt: string): Promise<NonNullable<Seo["opengraphImage"]>> => {
  const image = await getImage({ ...BROWN_BEAR_ROAR, format: "png" });
  return {
    alt,
    height: String(BROWN_BEAR_ROAR.height),
    sourceUrl: new URL(image.src, SITE_URL).href,
    type: "image/png",
    width: String(BROWN_BEAR_ROAR.width),
  };
};
