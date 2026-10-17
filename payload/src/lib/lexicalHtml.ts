// Shared with the Astro app via `payload-app/lexical-html` (renders stored Lexical rich text as HTML).
import type { HTMLConverters, HTMLConvertersFunction } from "@payloadcms/richtext-lexical/html";

import { convertLexicalToHTML, LinkHTMLConverter } from "@payloadcms/richtext-lexical/html";

import type { Media } from "../payload-types";

import { docPath, isRoutedCollection } from "./routes";

export const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

/** Site path of an internal link's doc; "#" when the doc is not populated (query depth 0) or has no page. */
const internalDocToHref = ({ linkNode }: { linkNode: { fields: { doc?: { relationTo?: string; value?: unknown } | null } } }): string => {
  const { relationTo, value } = linkNode.fields.doc ?? {};
  const slug = typeof value === "object" && value ? (value as { slug?: unknown }).slug : undefined;
  return isRoutedCollection(relationTo) && typeof slug === "string" && slug ? docPath(relationTo, slug) : "#";
};

export type LexicalHtmlOptions = {
  /** Base for media urls; the site is not served from the CMS host. Defaults to PAYLOAD_SERVER_URL. */
  mediaBase?: string;
  /** Converters that replace the defaults per node type (e.g. a styled quote). */
  converters?: HTMLConverters;
};

/** Stored Lexical state -> HTML (no wrapper div). Needs uploads populated (query depth >= 1). */
export function lexicalToHtml(state: unknown, { converters: overrides, mediaBase = process.env.PAYLOAD_SERVER_URL }: LexicalHtmlOptions = {}): string {
  if (!state || typeof state !== "object" || !("root" in state)) return "";
  const converters: HTMLConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkHTMLConverter({ internalDocToHref }),
    upload: ({ node }) => {
      const media = (node as { value?: unknown }).value as Media | number | undefined;
      if (typeof media !== "object" || !media?.url) return "";
      return `<img src="${escapeHtml(new URL(media.url, mediaBase).toString())}" alt="${escapeHtml(media.alt ?? "")}">`;
    },
    ...overrides,
  });
  return convertLexicalToHTML({ converters, data: state as never, disableContainer: true });
}

export type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
