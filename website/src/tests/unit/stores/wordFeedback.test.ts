import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: toast }));

import {
  $feedback,
  $feedbackError,
  $profile,
  answerUsage,
  loadFeedback,
  nextStep,
  parseProfile,
  sendFeedback,
} from "@stores/wordFeedback.ts";

const state = {
  compare: { area: null, east: null, moved: null, west: null },
  mine: null,
  totals: { dislike: 0, know: 0, like: 1, never: 0, say: 0 },
};
const ok = (body: unknown = state) => ({ json: async () => body, ok: true });

beforeEach(() => {
  vi.restoreAllMocks();
  toast.mockClear();
  $feedback.set(null);
  $feedbackError.set(false);
  $profile.set({});
});

describe("parseProfile", () => {
  it("drops unknown keys and values", () => {
    expect(parseProfile({ age: "30-39", area: "atlantis", x: 1 })).toEqual({ age: "30-39" });
  });
  it("keeps null as skipped", () => expect(parseProfile({ area: null })).toEqual({ area: null }));
  it("treats malformed input as empty", () => {
    expect(parseProfile("garbage")).toEqual({});
    expect(parseProfile(null)).toEqual({});
  });
  it("persisted garbage in localStorage decodes to an empty profile", () => {
    localStorage.setItem("bs-word-feedback-profile", "{not json");
    expect($profile.get()).toEqual({});
  });
});

describe("nextStep", () => {
  it.each([
    [{}, "area"],
    [{ area: null }, "origin"],
    [{ area: "pankow", origin: "grewUp" }, "half"],
    [{ area: null, origin: "movedOver10" }, "age"],
    [{ age: null, area: null, origin: null }, "done"],
  ] as const)("%j -> %s", (p, step) => expect(nextStep(p)).toBe(step));
});

describe("loadFeedback", () => {
  it("is a no-op for the same word, reloads for another", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    await loadFeedback(101);
    await loadFeedback(101);
    expect(f).toHaveBeenCalledTimes(1);
    expect($feedback.get()).toEqual(state);
    await loadFeedback(102);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("a failed GET does not wedge later loads", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    await loadFeedback(201);
    expect($feedback.get()).toBeNull();
    await loadFeedback(201);
    expect($feedback.get()).toEqual(state);
  });
});

describe("sendFeedback", () => {
  it("success updates $feedback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    expect(await sendFeedback(1, { reaction: "like" })).toBe(true);
    expect($feedback.get()).toEqual(state);
  });
  it("failure keeps $feedback, sets error, toasts", async () => {
    $feedback.set(state);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await sendFeedback(1, { reaction: "like" })).toBe(false);
    expect($feedback.get()).toBe(state);
    expect($feedbackError.get()).toBe(true);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hat nich jeklappt, versuch's nochma." }),
    );
  });
  it("non-ok response counts as failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}), ok: false }));
    expect(await sendFeedback(1, { usage: "say" })).toBe(false);
    expect($feedback.get()).toBeNull();
  });
});

describe("answerUsage", () => {
  it("sends usage with the profile in one PATCH", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    $profile.set({ area: "pankow", origin: null });
    await answerUsage(5, "say");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({
      area: "pankow",
      origin: null,
      usage: "say",
      word: 5,
    });
    expect(f.mock.calls[0][1].method).toBe("PATCH");
  });
});
