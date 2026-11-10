import { containsLink } from "payload-app/comments";
import { z } from "zod";

const token = z.string().regex(/^[0-9a-f]{64}$/);

export const redeemSchema = z.strictObject({ code: z.string().max(40) });

export const nextSchema = z.strictObject({ token });

/** The finish body. 400 answers bound the work per request; the route checks them against the dealt cards. */
export const finishSchema = z.strictObject({
  answers: z.array(z.strictObject({ card: z.string().max(20), real: z.boolean() })).max(400),
  playerName: z
    .string()
    .trim()
    .max(24)
    .refine((v) => !containsLink(v), "no links")
    .optional()
    .transform((v) => v || "Anonym"),
  token,
});
