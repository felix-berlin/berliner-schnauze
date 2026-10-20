import type { SanitizedConfig } from "payload";

import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";

import type { Word } from "../payload-types";

export type RichText = NonNullable<Word["infoText"]>;

const editorConfigs = new WeakMap<SanitizedConfig, ReturnType<typeof editorConfigFactory.default>>();

type LexicalNode = { type?: string; children?: LexicalNode[]; [k: string]: unknown };

/**
 * HTML -> Lexical state for the default editor (built once per config).
 * Every `<img>` becomes `<a href=src>alt</a>` first, because Lexical would otherwise create "pending"
 * upload nodes that Payload refuses to save.
 */
export async function htmlToLexical(html: string, config: SanitizedConfig): Promise<RichText> {
  let editorConfig = editorConfigs.get(config);
  if (!editorConfig) editorConfigs.set(config, (editorConfig = editorConfigFactory.default({ config })));

  const doc = new JSDOM(escapeUrlBrackets(html)).window.document;
  for (const img of doc.querySelectorAll("img")) {
    const link = doc.createElement("a");
    link.setAttribute("href", img.getAttribute("src") ?? "");
    link.textContent = img.getAttribute("alt") || "Bild";
    img.replaceWith(link);
  }

  // Lexical's DOM import drops `rel`: remember the sponsored (affiliate) urls and set the link field after.
  const sponsored = new Set(
    [...doc.querySelectorAll("a[href]")].filter((a) => /\bsponsored\b/i.test(a.getAttribute("rel") ?? "")).map((a) => a.getAttribute("href")),
  );
  const state = convertHTMLToLexical({ editorConfig: await editorConfig, html: doc.body.innerHTML, JSDOM }) as unknown as RichText;
  if (sponsored.size) markSponsored(state.root as LexicalNode, sponsored);
  return state;
}

function markSponsored(node: LexicalNode, urls: Set<string | null>) {
  const fields = node.fields as { url?: string; sponsored?: boolean } | undefined;
  if (node.type === "link" && fields && urls.has(fields.url ?? null)) fields.sponsored = true;
  for (const child of node.children ?? []) markSponsored(child, urls);
}

/** A literal `<https://...>` (Wikimedia attribution) must stay text, the parser would swallow it as a tag. */
const escapeUrlBrackets = (html: string): string => html.replace(/<(?=https?:)/gi, "&lt;");

