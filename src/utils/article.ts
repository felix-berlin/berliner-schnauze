export interface TocEntry {
  id: string;
  text: string;
}

export interface ArticleBlock {
  name: string;
  order: number;
  saveContent?: string | null;
  attributes?: unknown;
}

export interface ProcessedArticle {
  blocks: ArticleBlock[];
  toc: TocEntry[];
  hasAffiliateLinks: boolean;
}

// Gutenberg's link UI writes rel="sponsored" (or "… sponsored …") when an
// editor marks a link as sponsored/affiliate — network-agnostic, survives
// link format changes, and matches Google's own rel=sponsored guidance.
const SPONSORED_LINK_PATTERN = /\brel="[^"]*\bsponsored\b[^"]*"/i;

// Reduce heading markup to plain text for TOC labels + slugs. The strip is
// applied in a fixpoint loop so nested/crafted tags can't reconstruct after a
// single pass, then any residual angle bracket is removed — the result can
// never carry an HTML element (CodeQL js/incomplete-multi-character-sanitization).
const stripTags = (html: string): string => {
  let text = html;
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, "");
  } while (text !== previous);
  return text.replace(/[<>]/g, "").trim();
};

/**
 * Build-time slug for heading anchors. German-aware (umlauts → ae/oe/ue, ß → ss)
 * so the fragment ids stay ASCII and readable.
 */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Prepares WordPress article blocks for the reading page:
 *  - injects unique ids onto <h2> headings and collects a table of contents
 *    (the "Quellen" appendix heading is intentionally kept out of the TOC)
 *  - gives the first footnote reference for each source (`<a href="#quelle-N">`)
 *    a return anchor (`id="fnref-N"`)
 *  - appends a back-link (↩) to each cited "Quellen" entry so footnotes are
 *    bi-directional
 *
 * Forward links (`[N]` → #quelle-N) and the `id="quelle-N"` entries already
 * exist in the source HTML; this only adds what's missing.
 */
export const processArticleBlocks = (blocks: ArticleBlock[]): ProcessedArticle => {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const toc: TocEntry[] = [];
  const slugCounts = new Map<string, number>();
  const seenRefs = new Set<string>();
  const hasAffiliateLinks = sorted.some(
    (block) => block.saveContent && SPONSORED_LINK_PATTERN.test(block.saveContent),
  );

  const uniqueSlug = (base: string): string => {
    const key = base || "abschnitt";
    const seen = slugCounts.get(key) ?? 0;
    slugCounts.set(key, seen + 1);
    return seen === 0 ? key : `${key}-${seen + 1}`;
  };

  const outBlocks = sorted.map((block) => {
    if (block.name === "core/image" || block.name === "core/quote") return block;

    const source = block.saveContent ?? "";
    if (!source) return block;

    let html = source;

    // 1. Headings: ensure an id and collect the TOC (skip the Quellen appendix).
    html = html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs: string, inner: string) => {
      const text = stripTags(inner);
      const isQuellen = text.toLowerCase() === "quellen";
      const existingId = attrs.match(/\bid="([^"]+)"/)?.[1];

      if (existingId) {
        if (!isQuellen) toc.push({ id: existingId, text });
        return match;
      }

      const id = uniqueSlug(slugify(text));
      if (!isQuellen) toc.push({ id, text });
      return `<h2${attrs} id="${id}">${inner}</h2>`;
    });

    // 2. Footnote references: first mention of each source becomes a return target.
    html = html.replace(/<a\s+href="#quelle-(\d+)"/gi, (match, num: string) => {
      if (seenRefs.has(num)) return match;
      seenRefs.add(num);
      return `<a id="fnref-${num}" href="#quelle-${num}"`;
    });

    // 3. Quellen entries: add a back-link to the citing reference (only if cited).
    html = html.replace(/<li\s+id="quelle-(\d+)">([\s\S]*?)<\/li>/gi, (match, num: string, inner: string) => {
      if (!seenRefs.has(num)) return match;
      return `<li id="quelle-${num}">${inner} <a class="c-magazin-article__backref" href="#fnref-${num}" aria-label="Zurück zur Textstelle">↩</a></li>`;
    });

    // 4. Sponsored links: visibly label each one, not just the article-level notice.
    html = html.replace(
      /<a\b[^>]*\brel="[^"]*\bsponsored\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
      (match) => `${match}<span class="c-magazin-article__sponsored-tag">Anzeige</span>`,
    );

    return { ...block, saveContent: html };
  });

  return { blocks: outBlocks, hasAffiliateLinks, toc };
};
