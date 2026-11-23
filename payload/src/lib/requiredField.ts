import type { Validate } from "payload";

import { select, textarea } from "payload/shared";

/** Payload's `Validate` generics differ per field type; the wrappers below only forward to the stock validator. */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyValidate = Validate<any, any, any, any>;

/**
 * The stock validator with `required` switched on, without the NOT NULL column that `required: true` would add:
 * the tables of v18 are nullable for the rolling release, so the rule lives in the validator only.
 */
export const requiredSelect: AnyValidate = (value, options) =>
  (select as AnyValidate)(value, { ...options, required: true });

export const requiredTextarea: AnyValidate = (value, options) =>
  (textarea as AnyValidate)(value, { ...options, required: true });
