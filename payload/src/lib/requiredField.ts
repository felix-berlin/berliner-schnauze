import type { Validate } from "payload";

import { select } from "payload/shared";

import { hasLexicalText } from "./routes";

/** Payload's `Validate` generics differ per field type; the wrappers below only forward to the stock validator. */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyValidate = Validate<any, any, any, any>;

/**
 * The stock validator with `required` switched on, without the NOT NULL column that `required: true` would add:
 * the tables of v18 are nullable for the rolling release, so the rule lives in the validator only.
 */
export const requiredSelect: AnyValidate = (value, options) =>
  (select as AnyValidate)(value, { ...options, required: true });

/** Rich text with at least one character (an empty editor still holds one empty paragraph); no NOT NULL column. */
export const requiredRichText: AnyValidate = (value) =>
  hasLexicalText(value) || "Dieses Feld ist erforderlich.";
