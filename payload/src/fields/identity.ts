import type { Field } from "payload";

/** WordPress origin id + public slug, shared by all imported collections. */
export const identityFields: Field[] = [
  { name: "wpId", type: "number", unique: true, index: true, admin: { readOnly: true } },
  { name: "slug", type: "text", unique: true, index: true },
];
