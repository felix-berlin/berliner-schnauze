import type { SiteMedia } from "@services/payload/words.ts";

import { escapeHtml } from "payload-app/lexical-html";

/** Dimensions assumed for a media entry without them (the CMS did not store any): a 4:3 landscape. */
export const FALLBACK_IMAGE_WIDTH = 800;
export const FALLBACK_IMAGE_HEIGHT = 600;

export interface WordImage {
  alt: string;
  /**
   * Attribution as inline **HTML** (CMS rich text, already escaped by lexicalToHtml); null when the CMS has none.
   * Render it with `set:html` only; never as text (it would show the tags) and never from another source.
   */
  credit: string | null;
  height: number;
  src: string;
  width: number;
}

/** Unwraps a single paragraph so the credit fits inline after "Foto: ". */
const inline = (html: string): string =>
  html.startsWith("<p>") && html.endsWith("</p>") && !html.includes("<p", 1) ? html.slice(3, -4) : html;

/**
 * The CMS has no credit field: like the old gallery, the media description carries the attribution and the caption is
 * the fallback (some captions read "Credit: Name"). Neither → no credit, the page then shows no "Foto:" line.
 */
const creditOf = ({ caption, descriptionHtml }: Pick<SiteMedia, "caption" | "descriptionHtml">): string | null => {
  if (descriptionHtml) return inline(descriptionHtml);
  const text = caption?.replace(/^credit:\s*/i, "").trim();
  return text ? escapeHtml(text) : null;
};

export const toWordImages = (images: SiteMedia[], word: string): WordImage[] =>
  images.map((image) => ({
    alt: image.alt || word,
    credit: creditOf(image),
    height: image.height || FALLBACK_IMAGE_HEIGHT,
    src: image.url,
    width: image.width || FALLBACK_IMAGE_WIDTH,
  }));
