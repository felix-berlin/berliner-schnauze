import type { CollectionBeforeChangeHook } from "payload";

import { APIError } from "payload";

import { matchKey, wordSlug } from "../lib/wordMatch";

const taken = (slug: string) =>
  new APIError(
    `Es gibt schon ein Wort mit dem Slug „${slug}“. Bitte unter „Wort“ das vorhandene Wort auswählen (Ähnliche Wörter stehen in der Seitenleiste).`,
    400,
  );

/**
 * beforeChange of suggestions: fills `similarWords`, and creates a draft word when the status becomes "accepted" without a
 * `word` (a hand-chosen `word` is only linked).
 */
export const adoptSuggestion: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const d = { ...originalDoc, ...data };
  const berlinerWord: string = d.berlinerWord ?? "";

  // The admin form sends every field on each save: only a new suggestion or a changed spelling needs a new search.
  if (
    operation === "create" ||
    (data.berlinerWord !== undefined && data.berlinerWord !== originalDoc?.berlinerWord)
  ) {
    try {
      // shortcut: loads every word's slug and spelling per search; fine for the rare suggestion, switch to a stored
      // match key on words if volume grows.
      const { docs } = await req.payload.find({
        collection: "words",
        depth: 0,
        limit: 0,
        pagination: false,
        select: { slug: true, berlinerisch: true },
        draft: true,
        req,
      });
      const key = matchKey(berlinerWord);
      const own = typeof d.word === "object" ? d.word?.id : d.word;
      const similar = key
        ? docs.filter((w) => w.id !== own && matchKey(w.berlinerisch ?? "") === key)
        : [];
      data.similarWords = similar.map((w) => w.id);
      req.context.similarWords = similar.map((w) => `${w.berlinerisch} (${w.slug})`);
    } catch (err) {
      // The list is a convenience: never lose the suggestion over it. The mail then has no line (see the log).
      req.payload.logger.error({ err, msg: "suggestion: similar-words search failed" });
    }
  }

  if (data.status === "accepted" && originalDoc?.status !== "accepted" && d.word == null) {
    const slug = wordSlug(berlinerWord);
    if (!slug) throw new APIError("Aus diesem Vorschlag lässt sich kein Slug bilden.", 400);
    const { totalDocs } = await req.payload.count({
      collection: "words",
      where: { slug: { equals: slug } },
      req,
    });
    if (totalDocs > 0) throw taken(slug);
    const word = await req.payload
      .create({
        collection: "words",
        draft: true,
        data: {
          berlinerisch: berlinerWord,
          slug,
          translations: [{ translation: d.translation }],
          examples: d.example ? [{ example: d.example }] : [],
        },
        req,
      })
      .catch((err: unknown) => {
        // A concurrent accept can take the slug between the count above and this create.
        if (/unique|duplicate/i.test(String((err as Error)?.message))) throw taken(slug);
        throw err;
      });
    data.word = word.id;
  }
  return data;
};
