import type { CollectionBeforeChangeHook } from "payload";

import { deriveWordFields } from "../lib/wordDerived";

/** Recomputes `derived` from berlinerisch on every save (drafts included). */
export const setDerivedWordFields: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  data.derived = deriveWordFields(data.berlinerisch ?? originalDoc?.berlinerisch ?? "");
  return data;
};
