import type { CollectionSlug, Field, TextFieldSingleValidation } from "payload";

import { findSlugHolder } from "../lib/slugHolder";

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
      const holder = await findSlugHolder(req.payload, collectionSlug as CollectionSlug, value, {
        excludeId: id,
        req,
      });
      return holder?.trashed
        ? `Der Slug „${value}“ gehört einem Eintrag im Papierkorb (#${holder.id}). Dort endgültig löschen oder wiederherstellen.`
        : true;
    }) satisfies TextFieldSingleValidation,
  },
];
