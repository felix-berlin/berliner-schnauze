import type { CollectionBeforeChangeHook } from "payload";

import { APIError } from "payload";

import { matchKey, wordSlug } from "../lib/wordMatch";

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

  // Only a create or an edit of the spelling needs a fresh search (the lock update sends neither).
  if (operation === "create" || data.berlinerWord !== undefined) {
    // shortcut: loads every slug and spelling (a few thousand rows) per such save; fine for the rare suggestion,
    // switch to a stored match key on words if this ever runs per keystroke.
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
    const similar = key ? docs.filter((w) => matchKey(w.berlinerisch ?? "") === key) : [];
    data.similarWords = similar.map((w) => w.id);
    req.context.similarWords = similar.map((w) => `${w.berlinerisch} (${w.slug})`);
  }

  if (data.status === "accepted" && originalDoc?.status !== "accepted" && d.word == null) {
    const slug = wordSlug(berlinerWord);
    if (!slug) throw new APIError("Aus diesem Vorschlag lässt sich kein Slug bilden.", 400);
    const { totalDocs } = await req.payload.count({
      collection: "words",
      where: { slug: { equals: slug } },
      req,
    });
    if (totalDocs > 0)
      throw new APIError(
        `Es gibt schon ein Wort mit dem Slug „${slug}“. Bitte unter „Wort“ das vorhandene Wort auswählen (Ähnliche Wörter stehen in der Seitenleiste).`,
        400,
      );
    const word = await req.payload.create({
      collection: "words",
      draft: true,
      data: {
        berlinerisch: berlinerWord,
        slug,
        translations: [{ translation: d.translation }],
        examples: d.example ? [{ example: d.example }] : [],
      },
      req,
    });
    data.word = word.id;
  }
  return data;
};
