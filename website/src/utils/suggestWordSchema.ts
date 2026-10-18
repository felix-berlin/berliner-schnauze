import { z } from "zod";

/** Required text: empty and one-letter answers get their own message. */
const required = (missing: string, tooShort: string, max: number) =>
  z.string().trim().min(1, missing).min(2, tooShort).max(max, "Ditt is ein bisken zu lang.");

/** Optional text: empty is fine, a single letter is not. */
const optional = (tooShort: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, "Ditt is ein bisken zu lang.")
    .refine((v) => v.length !== 1, tooShort);

/** The suggest-word form's fields. The browser validates with it for the messages, the server again for safety. */
export const suggestWordSchema = z.object({
  berlinerWord: required(
    "Hey du hast ditt Wort vergessen.",
    "Oh, ditt is aber een sehr kurzes Wort",
    100,
  ),
  example: optional("Mehr is dir nicht eingefallen?", 1000),
  translation: required(
    "Ohne die Übersetzung wird dett etwas schwierig.",
    "Ditt is aber ne kleene Übersetzung.",
    300,
  ),
  // z.email rejects whitespace, so a CR/LF can never reach a mail header.
  userMail: z.union([z.literal(""), z.email("Irgendwas läuft hier nicht").max(254)]),
  userName: optional("Du hast nen sehr kleinen Namen", 100),
});

export type SuggestWord = z.infer<typeof suggestWordSchema>;
