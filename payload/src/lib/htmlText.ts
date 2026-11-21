const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&",
};

/** Drops tags until none are left, so `<scr<b>ipt>` cannot reassemble into a tag. */
export const stripTags = (html: string, replacement = ""): string => {
  let text = html;
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^<>]*>/g, replacement);
  } while (text !== previous);
  return text;
};

/** Decodes the entities `lexicalToHtml` escapes, in one pass so `&amp;lt;` stays `&lt;`. */
export const decodeEntities = (text: string): string =>
  text.replace(/&(?:lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity] ?? entity);

export const htmlToText = (html: string, replacement = ""): string =>
  decodeEntities(stripTags(html, replacement));
