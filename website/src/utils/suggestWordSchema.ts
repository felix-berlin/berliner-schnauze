import {
  BERLINER_WORD_MAX,
  SUGGESTED_EXAMPLE_MAX,
  SUGGESTER_MAIL_MAX,
  SUGGESTER_NAME_MAX,
  TOO_LONG,
  TRANSLATION_MAX,
} from "payload-app/submission-limits";
import { z } from "zod";

/** Required text: empty and one-letter answers get their own message. */
const required = (missing: string, tooShort: string, max: number) =>
  z.string().trim().min(1, missing).min(2, tooShort).max(max, TOO_LONG);

/** Optional text: empty is fine, a single letter is not. */
const optional = (tooShort: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, TOO_LONG)
    .refine((v) => v.length !== 1, tooShort);

/** The suggest-word form's fields. The browser validates with it for the messages, the server again for safety. */
export const suggestWordSchema = z.object({
  berlinerWord: required(
    "Hey du hast ditt Wort vergessen.",
    "Oh, ditt is aber een sehr kurzes Wort",
    BERLINER_WORD_MAX,
  ),
  example: optional("Mehr is dir nicht eingefallen?", SUGGESTED_EXAMPLE_MAX),
  translation: required(
    "Ohne die Übersetzung wird dett etwas schwierig.",
    "Ditt is aber ne kleene Übersetzung.",
    TRANSLATION_MAX,
  ),
  // z.email rejects whitespace, so a CR/LF can never reach a mail header.
  userMail: z.union([z.literal(""), z.email("Irgendwas läuft hier nicht").max(SUGGESTER_MAIL_MAX)]),
  userName: optional("Du hast nen sehr kleinen Namen", SUGGESTER_NAME_MAX),
});

export type SuggestWord = z.infer<typeof suggestWordSchema>;
