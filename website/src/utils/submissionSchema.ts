import { MISSING, TOO_LONG, WORD_SLUG_MAX } from "payload-app/submission-limits";
import { z } from "zod";

/** Required text of a submission: trimmed, empty and too long get their own message. */
export const trimmedText = (max: number) => z.string().trim().min(1, MISSING).max(max, TOO_LONG);

/** The slug of the word a submission is about. */
export const wordSlugField = z.string().min(1).max(WORD_SLUG_MAX);
