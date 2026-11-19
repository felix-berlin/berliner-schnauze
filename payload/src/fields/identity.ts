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
    validate: (async (value, { collectionSlug, event, id, req }) => {
      // Not on every keystroke of the admin form: the save (and the Local API) checks.
      if (!value || !collectionSlug || event === "onChange") return true;
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
