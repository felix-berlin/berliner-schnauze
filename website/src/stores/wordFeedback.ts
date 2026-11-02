import type { MyFeedback, WordFeedbackState } from "@utils/wordFeedbackSchema.ts";

import { persistentAtom } from "@nanostores/persistent";
import { createToastNotify } from "@stores/toastNotify.ts";
import { atom } from "nanostores";
import {
  AGES,
  AREAS,
  HALVES,
  ORIGINS,
  type Age,
  type Area,
  type Half,
  type Origin,
  type Usage,
} from "payload-app/word-feedback";

// A key present with null means "skipped", absent means "not asked yet".
export type Profile = {
  age?: Age | null;
  area?: Area | null;
  half?: Half | null;
  origin?: Origin | null;
};

export const $feedback = atom<WordFeedbackState | null>(null);
export const $feedbackError = atom<boolean>(false);

const FIELDS = { age: AGES, area: AREAS, half: HALVES, origin: ORIGINS } as const;

export const parseProfile = (raw: unknown): Profile => {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, string | null> = {};
  for (const [key, allowed] of Object.entries(FIELDS)) {
    const v = (raw as Record<string, unknown>)[key];
    if (v === null || (typeof v === "string" && (allowed as readonly string[]).includes(v)))
      out[key] = v;
  }
  return out as Profile;
};

const safeJsonParse = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};

// @nanostores/persistent already skips localStorage when it does not exist (SSR).
export const $profile = persistentAtom<Profile>(
  "bs-word-feedback-profile",
  {},
  {
    decode: (s) => parseProfile(safeJsonParse(s)),
    encode: JSON.stringify,
  },
);

export const nextStep = (profile: Profile): "age" | "area" | "done" | "half" | "origin" => {
  if (!("area" in profile)) return "area";
  if (!("origin" in profile)) return "origin";
  if (profile.origin === "grewUp" && !("half" in profile)) return "half";
  if (!("age" in profile)) return "age";
  return "done";
};

const URL = "/api/word-feedback";
let loadedFor: number | null = null;

export const loadFeedback = async (wordId: number): Promise<void> => {
  if (loadedFor === wordId) return;
  loadedFor = wordId;
  $feedback.set(null);
  try {
    const res = await fetch(`${URL}?word=${wordId}`);
    if (!res.ok) throw new Error(String(res.status));
    const state = (await res.json()) as WordFeedbackState;
    if (loadedFor === wordId) $feedback.set(state);
  } catch {
    if (loadedFor === wordId) loadedFor = null; // a failed GET must not block a retry
  }
};

export const sendFeedback = async (
  wordId: number,
  patch: Partial<MyFeedback>,
): Promise<boolean> => {
  try {
    const res = await fetch(URL, {
      body: JSON.stringify({ word: wordId, ...patch }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    if (!res.ok) throw new Error(String(res.status));
    $feedback.set((await res.json()) as WordFeedbackState);
    $feedbackError.set(false);
    return true;
  } catch {
    $feedbackError.set(true);
    createToastNotify({ message: "Hat nich jeklappt, versuch's nochma.", status: "error" });
    return false;
  }
};

export const answerUsage = (wordId: number, usage: Usage): Promise<boolean> =>
  sendFeedback(wordId, { usage, ...$profile.get() });
