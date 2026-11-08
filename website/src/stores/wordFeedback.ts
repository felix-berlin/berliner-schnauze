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

const FIELDS = {
  age: AGES,
  area: AREAS,
  half: HALVES,
  locality: LOCALITIES,
  origin: ORIGINS,
} as const;

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
  // The API rejects a half without origin grewUp; a stale one would fail every vote.
  if (out.half && out.origin !== "grewUp") delete out.half;
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
  const woanders = profile.area === "brandenburg" || profile.area === "elsewhere";
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

export const sendFeedback = async (
  wordId: number,
  patch: Partial<MyFeedback>,
  /** Replaces the generic text when the server sent no reason of its own. */
  fallbackMessage = "Hat nich jeklappt, versuch's nochma.",
): Promise<boolean> => {
  const seq = ++sent;
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
      createToastNotify({
        message: error ?? fallbackMessage,
        status: res.status === 429 ? "warning" : "error",
      });
      return false;
    }
    const state = (await res.json()) as WordFeedbackState;
    // The user may have navigated to another word while the PATCH was in flight; a failed GET left no word set.
    if ((loadedFor === wordId || (loadedFor === null && failedFor === wordId)) && seq > applied) {
      loadedFor = wordId;
      applied = seq;
      stateVersion++;
      $feedback.set(state);
    }
    return true;
  } catch (error) {
    console.error(`[word-feedback] send ${wordId} failed:`, error);
    createToastNotify({ message: fallbackMessage, status: "error" });
    return false;
  }
};

export const answerUsage = (wordId: number, usage: Usage): Promise<boolean> =>
  sendFeedback(wordId, { usage, ...parseProfile($profile.get()) });

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
