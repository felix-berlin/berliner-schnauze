import type { CollectionAfterChangeHook } from "payload";

/** A word that goes live locks the suggestions it came from (`published`, see the `update` access in Suggestions). */
export const lockSuggestions: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc._status !== "published") return doc;
  await req.payload.update({
    collection: "suggestions",
    where: { word: { equals: doc.id }, published: { not_equals: true } },
    data: { published: true },
    req,
  });
  return doc;
};
