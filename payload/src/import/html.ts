import type { SanitizedConfig } from "payload";

import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";

import type { Word } from "../payload-types";

import { isWpUploadUrl, wpUploadPath } from "../lib/wpUploadPath";

export type RichText = NonNullable<Word["infoText"]>;

export type HtmlImageOptions = {
  /** Keyed by `wpUploadPath(src)`; mapped `<img>` become upload nodes. */
  mediaIdByUrl?: Map<string, number>;
  /** Called for every `<img>` that is not mapped (it becomes a plain link). */
  onUnmappedImage?: (src: string) => void;
};

const editorConfigs = new WeakMap<SanitizedConfig, ReturnType<typeof editorConfigFactory.default>>();

type LexicalNode = { type?: string; children?: LexicalNode[]; [k: string]: unknown };

/** Lexical's DOM import gives string ids and `fields: {}`; store the same shape as image blocks. */
function normalizeUploads(node: LexicalNode) {
  if (node.type === "upload") {
    if (node.relationTo == null || node.value == null) throw new Error("htmlToLexical produced an upload node without a relation");
    node.value = Number(node.value);
    node.fields = null;
  }
  for (const child of node.children ?? []) normalizeUploads(child);
}

/**
 * WordPress HTML -> Lexical state for the default editor (built once per config).
 * Every `<img>` is rewritten first: mapped media -> upload node, anything else -> `<a href=src>alt</a>`,
 * because Lexical would otherwise create "pending" upload nodes that Payload refuses to save.
 */
export async function htmlToLexical(html: string, config: SanitizedConfig, opts: HtmlImageOptions = {}): Promise<RichText> {
  let editorConfig = editorConfigs.get(config);
  if (!editorConfig) editorConfigs.set(config, (editorConfig = editorConfigFactory.default({ config })));

  const doc = new JSDOM(escapeUrlBrackets(html)).window.document;
  for (const img of doc.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    const id = isWpUploadUrl(src) ? opts.mediaIdByUrl?.get(wpUploadPath(src)) : undefined;
    if (id != null) {
      img.setAttribute("data-lexical-upload-relation-to", "media");
      img.setAttribute("data-lexical-upload-id", String(id));
      continue;
    }
    const link = doc.createElement("a");
    link.setAttribute("href", src);
    link.textContent = img.getAttribute("alt") || "Bild";
    img.replaceWith(link);
    opts.onUnmappedImage?.(src);
  }

  const state = convertHTMLToLexical({ editorConfig: await editorConfig, html: doc.body.innerHTML, JSDOM }) as unknown as RichText;
  normalizeUploads(state.root as LexicalNode);
  return state;
}

/** `<img>` sources (with alt) in an HTML string. */
export const imagesIn = (html: string): { src: string; alt: string | null }[] =>
  [...new JSDOM(html).window.document.querySelectorAll("img")].map((img) => ({ src: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") || null }));

/** A literal `<https://...>` (Wikimedia attribution) must stay text, the parser would swallow it as a tag. */
const escapeUrlBrackets = (html: string): string => html.replace(/<(?=https?:)/gi, "&lt;");

/**
 * Rendered HTML -> plain text (entities decoded). Paragraph ends and `<br>` become newlines.
 */
export const htmlToText = (html: string): string =>
  new JSDOM(escapeUrlBrackets(html).replace(/<br\s*\/?>|<\/p>\s*/gi, "\n")).window.document.body.textContent?.trim() ?? "";
