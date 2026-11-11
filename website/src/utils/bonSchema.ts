import { cleanName } from "payload-app/bon-names";
import { containsLink } from "payload-app/comments";
import { z } from "zod";

const token = z.string().regex(/^[0-9a-f]{64}$/);

export const redeemSchema = z.strictObject({ code: z.string().max(40) });

export const nextSchema = z.strictObject({ token });

export const answerSchema = z.strictObject({ card: z.string().max(20), real: z.boolean(), token });

/** The finish body; the answers are the ones stored by `answer`. */
export const finishSchema = z.strictObject({
  playerName: z
    .string()
    .trim()
    .max(24)
    .optional()
    // A name that reads as a link ("Anna.Berlin") counts as no name; refusing it would lose the whole result.
    .transform((v) => cleanName(!v || containsLink(v) ? "Anonym" : v)),
  token,
});
