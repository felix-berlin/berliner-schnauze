import type { CollectionBeforeChangeHook } from "payload";

import { decomposeCompoundWord } from "../lib/decompose";
import { deriveWordFields } from "../lib/wordDerived";

/** Recomputes `derived` from berlinerisch on every save (drafts included). */
export const setDerivedWordFields: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const berlinerisch = data.berlinerisch ?? originalDoc?.berlinerisch ?? "";
  data.derived = {
    ...deriveWordFields(berlinerisch),
    // Not in deriveWordFields: that is shared with the site, which must not load the dictionary.
    decomposition: decomposeCompoundWord(berlinerisch) ?? [],
  };
  return data;
};
