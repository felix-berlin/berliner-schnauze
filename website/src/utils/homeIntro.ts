// Words the intro sentence links when they exist as published words (SPEC startseite-v20 §5 item 1).
const LINKED = ["Atze", "Zicke"];

const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * Intro text as safe HTML: `{count}` becomes the de-DE formatted word count, the first whole-word
 * "Atze" and "Zicke" link to their word page when `linkable` (lemma -> slug) has them.
 */
export function linkIntro(
  text: string,
  wordCount: number,
  linkable: Record<string, string>,
): string {
  let html = escapeHtml(text).replaceAll("{count}", wordCount.toLocaleString("de-DE"));
  for (const lemma of LINKED) {
    const slug = linkable[lemma];
    if (!slug) continue;
    html = html.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${lemma}(?![\\p{L}\\p{N}])`, "u"),
      `<a href="/wort/${escapeHtml(slug)}">${lemma}</a>`,
    );
  }
  return html;
}
