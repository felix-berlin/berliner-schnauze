// Shared with the Astro app via `payload-app/lexical-html` (renders stored Lexical rich text as HTML).
import type { HTMLConvertersFunction } from "@payloadcms/richtext-lexical/html";

import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";

import type { Media } from "../payload-types";

export const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export type LexicalHtmlOptions = {
  /** Base for media urls; the site is not served from the CMS host. Defaults to PAYLOAD_SERVER_URL. */
  mediaBase?: string;
};

/** Stored Lexical state -> HTML (no wrapper div). Needs uploads populated (query depth >= 1). */
export function lexicalToHtml(state: unknown, { mediaBase = process.env.PAYLOAD_SERVER_URL }: LexicalHtmlOptions = {}): string {
  if (!state || typeof state !== "object" || !("root" in state)) return "";
  const converters: HTMLConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    upload: ({ node }) => {
      const media = (node as { value?: unknown }).value as Media | number | undefined;
      if (typeof media !== "object" || !media?.url) return "";
      return `<img src="${escapeHtml(new URL(media.url, mediaBase).toString())}" alt="${escapeHtml(media.alt ?? "")}">`;
    },
  });
  return convertLexicalToHTML({ converters, data: state as never, disableContainer: true });
}
