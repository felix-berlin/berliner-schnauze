import { STAT_KINDS } from "payload-app/word-stats";
import { z } from "zod";

export const wordPulseSchema = z.strictObject({
  kind: z.enum(STAT_KINDS),
  word: z.number().int().positive(),
});
