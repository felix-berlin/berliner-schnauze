// Words the intro sentence links when they exist as published words (SPEC startseite-v20 §5 item 1).
const LINKED = ["Atze", "Zicke"];

const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** `{count}` in a CMS text becomes the de-DE formatted live word count. */
export const withCount = (text: string, wordCount: number): string =>
  text.replaceAll("{count}", wordCount.toLocaleString("de-DE"));

/**
 * Splits the knowledge html before its third h3: intro and the first two h3 stay visible on mobile, the rest folds
 * into a details (SPEC startseite-v20 §12.1). Without a third h3 nothing folds.
 */
export function splitKnowledge(html: string): [lead: string, more: string] {
  const at = [...html.matchAll(/<h3[\s>]/g)][2]?.index;
  return at === undefined ? [html, ""] : [html.slice(0, at), html.slice(at)];
}

/**
 * Intro text as safe HTML: `{count}` becomes the de-DE formatted word count, the first whole-word
 * "Atze" and "Zicke" link to their word page when `linkable` (lemma -> slug) has them.
 */
export function linkIntro(
  text: string,
  wordCount: number,
  linkable: ReadonlyMap<string, string>,
): string {
  let html = withCount(escapeHtml(text), wordCount);
  for (const lemma of LINKED) {
    const slug = linkable.get(lemma);
    if (!slug) continue;
    html = html.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${lemma}(?![\\p{L}\\p{N}])`, "u"),
      `<a href="/wort/${escapeHtml(slug)}">${lemma}</a>`,
    );
  }
  return html;
}
