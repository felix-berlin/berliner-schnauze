import type { Field } from "payload";

/** Public, unique slug of words, themen, word types, posts and pages. */
export const identityFields: Field[] = [{ name: "slug", type: "text", unique: true, index: true }];
