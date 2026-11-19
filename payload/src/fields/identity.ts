import type { Field, TextFieldSingleValidation } from "payload";

/**
 * Public, unique slug of words, themen, word types, posts and pages. A trashed doc keeps its slug (the unique index has no
 * "not trashed" condition), so a clash with one says where the slug went instead of Payload's bare "Value must be unique".
 */
export const identityFields: Field[] = [
  {
    name: "slug",
    type: "text",
    unique: true,
    index: true,
    validate: (async (value, { collectionSlug, id, req }) => {
      if (!value || !collectionSlug) return true;
      const { docs } = (await req.payload.find({
        collection: collectionSlug,
        depth: 0,
        limit: 1,
        trash: true,
        select: { deletedAt: true },
        where: {
          and: [
            { slug: { equals: value } },
            { deletedAt: { exists: true } },
            ...(id ? [{ id: { not_equals: id } }] : []),
          ],
        },
        req,
      } as never)) as { docs: { id: number }[] };
      return docs.length
        ? `Der Slug „${value}“ gehört einem Eintrag im Papierkorb (#${docs[0].id}). Dort endgültig löschen oder wiederherstellen.`
        : true;
    }) satisfies TextFieldSingleValidation,
  },
];
