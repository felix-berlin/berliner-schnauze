import type { SanitizedConfig } from "payload";

import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";

import type { Word } from "../payload-types";

export type RichText = NonNullable<Word["infoText"]>;

const editorConfigs = new WeakMap<SanitizedConfig, ReturnType<typeof editorConfigFactory.default>>();

/** WordPress HTML -> Lexical state for the default editor (built once per config). */
export async function htmlToLexical(html: string, config: SanitizedConfig): Promise<RichText> {
  let editorConfig = editorConfigs.get(config);
  if (!editorConfig) editorConfigs.set(config, (editorConfig = editorConfigFactory.default({ config })));
  return convertHTMLToLexical({ editorConfig: await editorConfig, html, JSDOM }) as unknown as RichText;
}

/** Rendered HTML -> plain text (entities decoded). */
export const htmlToText = (html: string): string => new JSDOM(html).window.document.body.textContent?.trim() ?? "";
