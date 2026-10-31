// Shared with the Astro app via `payload-app/lexical-html` (renders stored Lexical rich text as HTML).
import type { HTMLConverters, HTMLConvertersFunction } from "@payloadcms/richtext-lexical/html";

import { convertLexicalToHTML, LinkHTMLConverter } from "@payloadcms/richtext-lexical/html";

import type { Media } from "../payload-types";

import { docPath, isRoutedCollection } from "./routes";

export const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

/**
 * Site path of an internal link's doc; "#" when the doc is not populated (query depth 0), has no page or is not
 * published (the Local API populates drafts too; a link would leak the draft's slug and 404).
 */
const internalDocToHref = ({ linkNode }: { linkNode: { fields: { doc?: { relationTo?: string; value?: unknown } | null } } }): string => {
  const { relationTo, value } = linkNode.fields.doc ?? {};
  const doc = typeof value === "object" && value ? (value as { slug?: unknown; _status?: unknown }) : undefined;
  if (doc?._status !== undefined && doc._status !== "published") return "#";
  return isRoutedCollection(relationTo) && typeof doc?.slug === "string" && doc.slug ? docPath(relationTo, doc.slug) : "#";
};

const links = LinkHTMLConverter({ internalDocToHref });
/** A link with the `sponsored` checkbox (payload.config) gets rel="sponsored", next to the new-tab rel if any. */
const sponsoredLink: NonNullable<HTMLConverters["link"]> = (args) => {
  const html = (links.link as (a: typeof args) => string)(args);
  if (!(args.node.fields as { sponsored?: unknown }).sponsored) return html;
  return html.includes(' rel="noopener noreferrer"')
    ? html.replace(' rel="noopener noreferrer"', ' rel="sponsored noopener noreferrer"')
    : html.replace(/^<a\b/, '<a rel="sponsored"');
};

/** "Kommentare & Co" -> "kommentare-co" (German umlauts transliterated), usable as an anchor id. */
export const slugifyHeading = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const nodeText = (node: unknown): string => {
  const { text, children } = node as { text?: unknown; children?: unknown[] };
  return typeof text === "string" ? text : (children ?? []).map(nodeText).join("");
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
    ...links,
    link: sponsoredLink,
    heading: (args) => {
      const html = (defaultConverters.heading as (a: typeof args) => string)(args);
      const id = slugifyHeading(nodeText(args.node));
      return id ? html.replace(/^<(h[1-6])/, `<$1 id="${id}"`) : html;
    },
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
