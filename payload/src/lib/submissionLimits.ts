// Character limits and refusal messages of the visitor submissions, shared by the collections, the site's API routes
// and forms (`payload-app/submission-limits`): no payload/next/config imports. Each value is what its place enforced
// before; they differ on purpose or by history, so the names say where a limit applies.

export const TOO_LONG = "Ditt is ein bisken zu lang.";
export const MISSING = "Ohne Text wird dett nüscht.";

/** Slug of the word a contribution, report or story is about (request field `word`). */
export const WORD_SLUG_MAX = 200;

// Contribute form (`suggestions` of type example / fact / related) and error reports.
export const EXAMPLE_MAX = 200;
export const FACT_MAX = 1000;
export const RELATED_MAX = 60;
export const HIGHDEUTSCH_MAX = 200;
export const REPORT_TEXT_MAX = 1000;
export const REPORT_EMAIL_MAX = 200;

/** Name on a contribution or a story as the site's routes and form accept it (the `comments` column allows NAME_MAX). */
export const SUBMISSION_NAME_MAX = 40;
/** A Jeschichte as the site's route accepts it (the `comments` column allows COMMENT_MAX). */
export const STORY_TEXT_MAX = 500;

// Suggest-word form (`suggestions` of type word).
export const BERLINER_WORD_MAX = 100;
export const TRANSLATION_MAX = 300;
export const SUGGESTED_EXAMPLE_MAX = 1000;
export const SUGGESTER_NAME_MAX = 100;
export const SUGGESTER_MAIL_MAX = 254;

/** Reason of a comment report. */
export const COMMENT_REPORT_REASON_MAX = 300;
