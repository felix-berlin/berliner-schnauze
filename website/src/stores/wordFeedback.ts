import type { MyFeedback, WordFeedbackState } from "@utils/wordFeedbackSchema.ts";

import { createToastNotify } from "@stores/toastNotify.ts";
import { atom } from "nanostores";
import {
  AGES,
  AREAS,
  AREA_LOCALITIES,
  HALVES,
  ORIGINS,
  LOCALITIES,
  LOCALITY_AREA,
  type Age,
  type Area,
  type Half,
  type Locality,
  type Origin,
  type Usage,
} from "payload-app/word-feedback";

// A key present with null means "skipped", absent means "not asked yet".
export type Profile = {
  age?: Age | null;
  area?: Area | null;
  half?: Half | null;
  locality?: Locality | null;
  origin?: Origin | null;
};

export const $feedback = atom<WordFeedbackState | null>(null);
/** The reason of the last failed silent send (server text, e.g. the daily cap); null while none failed. */
export const $sendError = atom<string | null>(null);

const FIELDS = {
  age: AGES,
  area: AREAS,
  half: HALVES,
  locality: LOCALITIES,
  origin: ORIGINS,
} as const;

/** Areas outside Berlin: no localities, and the East/West half is not asked (nor kept). */
const OUTSIDE_BERLIN = new Set<string>(["brandenburg", "elsewhere"]);

export const parseProfile = (raw: unknown): Profile => {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, string | null> = {};
  for (const [key, allowed] of Object.entries(FIELDS)) {
    const v = (raw as Record<string, unknown>)[key];
    if (v === null || (typeof v === "string" && (allowed as readonly string[]).includes(v)))
      out[key] = v;
  }
  // The API rejects a locality outside the area sent with it.
  if (out.locality && LOCALITY_AREA[out.locality as Locality] !== out.area) delete out.locality;
  // The API rejects a half without origin grewUp; a stale one would fail every vote. nextStep never asks
  // for one outside Berlin, so a stale half there is dropped too.
  if (out.half && (out.origin !== "grewUp" || OUTSIDE_BERLIN.has(out.area ?? ""))) delete out.half;
  return out as Profile;
};

const safeJsonParse = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};

const PROFILE_KEY = "bs-word-feedback-profile";
const REMEMBER_KEY = "bs-word-feedback-remember";
// localStorage can be missing (SSR) or throw (blocked): the profile then lives in memory only.
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* in memory only */
  }
};

/** The visitor ticked "remember my answers": only then the profile is kept in the browser (§ 25 TDDDG). */
export const $remember = atom(read(REMEMBER_KEY) === "yes");
export const $profile = atom<Profile>(
  $remember.get() ? parseProfile(safeJsonParse(read(PROFILE_KEY) ?? "")) : {},
);
const persist = () => write(PROFILE_KEY, $remember.get() ? JSON.stringify($profile.get()) : null);
// A profile saved before the opt-in existed has no consent behind it: drop it.
if (!$remember.get()) write(PROFILE_KEY, null);
$profile.listen(persist);

export const setRemember = (on: boolean) => {
  $remember.set(on);
  write(REMEMBER_KEY, on ? "yes" : null);
  write(PROFILE_KEY, on ? JSON.stringify($profile.get()) : null);
};

export const nextStep = (
  profile: Profile,
): "age" | "area" | "done" | "half" | "locality" | "origin" => {
  if (!("area" in profile)) return "area";
  // Asked only for a Berlin borough; brandenburg, elsewhere and a skipped area offer no localities.
  if (profile.area && profile.area in AREA_LOCALITIES && !("locality" in profile))
    return "locality";
  if (!("origin" in profile)) return "origin";
  // Woanders (outside Berlin) is not asked for the East/West half.
  const woanders = OUTSIDE_BERLIN.has(profile.area ?? "");
  if (profile.origin === "grewUp" && !woanders && !("half" in profile)) return "half";
  if (!("age" in profile)) return "age";
  return "done";
};

const ENDPOINT = "/api/word-feedback";
let loadedFor: number | null = null;
// The word whose GET failed last: an answer for it may still fill the state, one for another word may not.
let failedFor: number | null = null;
let loading: Promise<void> = Promise.resolve();
// Bumped whenever a PATCH result lands, so a slower GET started before it cannot overwrite it.
let stateVersion = 0;
// PATCH responses can overtake each other (thumbs and card send on their own): only the newest sent one applies.
let sent = 0;
let applied = 0;

export const loadFeedback = (wordId: number): Promise<void> => {
  if (loadedFor === wordId) return loading; // callers share the in-flight request
  loadedFor = wordId;
  $feedback.set(null);
  const startedAt = stateVersion;
  return (loading = (async () => {
    try {
      const res = await fetch(`${ENDPOINT}?word=${wordId}`);
      if (!res.ok) throw new Error(String(res.status));
      const state = (await res.json()) as WordFeedbackState;
      if (loadedFor === wordId && stateVersion === startedAt) $feedback.set(state);
    } catch (error) {
      console.error(`[word-feedback] load ${wordId} failed:`, error);
      if (loadedFor === wordId) {
        loadedFor = null; // a failed GET must not block a retry
        failedFor = wordId;
      }
    }
  })());
};

type SendOptions = {
  /** Replaces the generic text when the server sent no reason of its own. */
  fallbackMessage?: string;
  /** The caller shows the failure itself (inline via $sendError), so no toast. */
  silent?: boolean;
};

export const sendFeedback = async (
  wordId: number,
  patch: Partial<MyFeedback>,
  { fallbackMessage = "Hat nich jeklappt, versuch's nochma.", silent = false }: SendOptions = {},
): Promise<boolean> => {
  const seq = ++sent;
  $sendError.set(null);
  const fail = (message: string | null, status?: number) => {
    if (silent) $sendError.set(message);
    else
      createToastNotify({
        message: message ?? fallbackMessage,
        status: status === 429 ? "warning" : "error",
      });
    return false;
  };
  try {
    const res = await fetch(ENDPOINT, {
      body: JSON.stringify({ word: wordId, ...patch }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    if (!res.ok) {
      // The server says why (daily cap, rejected input, stored but not counted): a generic "try again" can be wrong.
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      console.error(`[word-feedback] send ${wordId} failed: ${res.status}`, error);
      return fail(error ?? null, res.status);
    }
    // A 2xx with an unreadable body still stored the answer: it is no failed vote, the state just stays as is.
    const state = (await res.json().catch((error) => {
      console.error(`[word-feedback] send ${wordId}: unreadable response body`, error);
      return null;
    })) as WordFeedbackState | null;
    // The user may have navigated to another word while the PATCH was in flight; a failed GET left no word set.
    if (
      state &&
      (loadedFor === wordId || (loadedFor === null && failedFor === wordId)) &&
      seq > applied
    ) {
      loadedFor = wordId;
      applied = seq;
      stateVersion++;
      $feedback.set(state);
    }
    return true;
  } catch (error) {
    console.error(`[word-feedback] send ${wordId} failed:`, error);
    return fail(null);
  }
};

export const answerUsage = (wordId: number, usage: Usage, silent = false): Promise<boolean> =>
  sendFeedback(wordId, { usage, ...parseProfile($profile.get()) }, { silent });

/** Deletes every answer tied to this browser (all words) and forgets the stored profile. */
export const deleteAllFeedback = async (wordId: number): Promise<boolean> => {
  try {
    const res = await fetch(ENDPOINT, { method: "DELETE" });
    if (!res.ok) throw new Error(String(res.status));
  } catch (error) {
    console.error("[word-feedback] delete all failed:", error);
    createToastNotify({ message: "Hat nich jeklappt, versuch's nochma.", status: "error" });
    return false;
  }
  $profile.set({});
  setRemember(false);
  loadedFor = null;
  stateVersion++;
  await loadFeedback(wordId);
  return true;
};
