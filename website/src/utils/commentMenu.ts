export type CommentMenuEntry = "copy" | "delete" | "edit" | "report";

/**
 * Entries of the ⋯ menu (spec §9a). Everyone can copy the link; the author gets Bearbeiten/Löschen while the
 * edit window is open (afterwards only the link, and never „Melden“ on one's own comment); others get Melden.
 */
export const commentMenuEntries = (c: { editable: boolean; own: boolean }): CommentMenuEntry[] =>
  c.own ? ["copy", ...(c.editable ? (["edit", "delete"] as const) : [])] : ["copy", "report"];

/** Reasons of the report panel (spec §9a); the server stores one text, so reason and note travel as "Grund – Notiz". */
export const REPORT_REASONS = [
  "Spam oder Werbung",
  "Beleidigend",
  "Falsch oder irreführend",
  "Wat anderet",
] as const;

export const REPORT_MAX = 300; // the API's limit for the whole text

export const reportText = (reason: string, note: string): string =>
  (note.trim() ? `${reason} – ${note.trim()}` : reason).slice(0, REPORT_MAX);
