import { safeGetJson, safeSet } from "@utils/safeStorage.ts";

/**
 * The visitor's own open contributions, kept in this browser only (suggestions have no server marker; stories come
 * from `/api/stories/mine`). Id-less on purpose: type, a text preview and the time are enough for the "Wird jeprüft" chip.
 */
export type OwnSubmission = { at: number; preview: string; type: "example" | "fact" | "related" };

const KEY = "bs-own-submissions";
const KEEP_MS = 14 * 24 * 60 * 60_000;
const MAX_PER_WORD = 20;
const PREVIEW = 60;

const read = <T>(key: string): Record<string, T[]> => {
  const parsed = safeGetJson(key);
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, T[]>)
    : {};
};

const valid = (s: unknown, now: number): s is OwnSubmission =>
  typeof s === "object" &&
  s !== null &&
  typeof (s as OwnSubmission).at === "number" &&
  typeof (s as OwnSubmission).preview === "string" &&
  now - (s as OwnSubmission).at < KEEP_MS;

/** Own submissions of one word that are younger than 14 days, newest first. */
export const ownSubmissions = (word: string, now = Date.now()): OwnSubmission[] => {
  const list = read<unknown>(KEY)[word];
  return Array.isArray(list) ? list.filter((s) => valid(s, now)) : [];
};

/** Remembers a sent suggestion (never the name or any e-mail). */
export const rememberSubmission = (
  word: string,
  type: OwnSubmission["type"],
  text: string,
  now = Date.now(),
): void => {
  const all = read<unknown>(KEY);
  // Drop expired entries of every word on the way, so the key cannot grow forever.
  for (const [w, list] of Object.entries(all)) {
    const kept = Array.isArray(list) ? list.filter((s) => valid(s, now)) : [];
    if (kept.length) all[w] = kept;
    else delete all[w];
  }
  all[word] = [
    { at: now, preview: text.trim().slice(0, PREVIEW), type },
    ...(all[word] ?? []),
  ].slice(0, MAX_PER_WORD);
  safeSet(KEY, JSON.stringify(all));
};
