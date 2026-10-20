import type { Field } from "payload";

/** Public slug, shared by all collections with their own site path. */
export const identityFields: Field[] = [{ name: "slug", type: "text", unique: true, index: true }];
