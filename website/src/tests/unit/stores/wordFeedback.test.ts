import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: toast }));

import {
  $feedback,
  $profile,
  $sendError,
  answerUsage,
  deleteAllFeedback,
  loadFeedback,
  nextStep,
  parseProfile,
  sendFeedback,
} from "@stores/wordFeedback.ts";

const state = {
  compare: { area: null, east: null, locality: null, moved: null, west: null },
  mine: null,
  totals: { dislike: 0, know: 0, like: 1, never: 0, say: 0 },
};
const ok = (body: unknown = state) => ({ json: async () => body, ok: true });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  toast.mockClear();
  $feedback.set(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
  $profile.set({});
});

describe("parseProfile", () => {
  it("drops unknown keys and values", () => {
    expect(parseProfile({ age: "30-39", area: "atlantis", x: 1 })).toEqual({ age: "30-39" });
  });
  it("drops the area keys of the old 14-area map as unknown (not asked yet)", () => {
    for (const area of ["wedding-tiergarten", "friedrichshain", "kreuzberg"])
      expect(parseProfile({ age: "30-39", area })).toEqual({ age: "30-39" });
  });
  it("keeps a locality only inside its own area", () => {
    expect(parseProfile({ area: "friedrichshain-kreuzberg", locality: "kreuzberg" })).toEqual({
      area: "friedrichshain-kreuzberg",
      locality: "kreuzberg",
    });
    expect(parseProfile({ area: "pankow", locality: "kreuzberg" })).toEqual({ area: "pankow" });
    expect(parseProfile({ locality: "kreuzberg" })).toEqual({});
    expect(parseProfile({ area: "brandenburg", locality: "kreuzberg" })).toEqual({
      area: "brandenburg",
    });
    expect(parseProfile({ area: "pankow", locality: "atlantis" })).toEqual({ area: "pankow" });
  });
  it("accepts a skipped Locality", () => {
    expect(parseProfile({ area: "pankow", locality: null })).toEqual({
      area: "pankow",
      locality: null,
    });
  });
  it("drops a stale half for areas outside Berlin even with origin grewUp", () => {
    for (const area of ["brandenburg", "elsewhere"])
      expect(parseProfile({ area, half: "east", origin: "grewUp" })).toEqual({
        area,
        origin: "grewUp",
      });
  });
  it("keeps null as skipped", () => expect(parseProfile({ area: null })).toEqual({ area: null }));
  it("treats malformed input as empty", () => {
    expect(parseProfile("garbage")).toEqual({});
    expect(parseProfile(null)).toEqual({});
  });
  it("drops a half unless origin is grewUp", () => {
    expect(parseProfile({ half: "east", origin: "movedOver10" })).toEqual({
      origin: "movedOver10",
    });
    expect(parseProfile({ half: "east" })).toEqual({});
    expect(parseProfile({ half: "east", origin: "grewUp" })).toEqual({
      half: "east",
      origin: "grewUp",
    });
  });
  it.each([
    ['{"area":"atlantis","age":"30-39"}', { age: "30-39" }],
    ["{not json", {}],
  ])("decodes persisted %s on a fresh store", async (stored, expected) => {
    vi.resetModules();
    localStorage.setItem("bs-word-feedback-remember", "yes");
    localStorage.setItem("bs-word-feedback-profile", stored);
    const fresh = await import("@stores/wordFeedback.ts");
    expect(fresh.$profile.get()).toEqual(expected);
  });

  it("ignores and drops a stored profile when the visitor never ticked remember", async () => {
    vi.resetModules();
    localStorage.removeItem("bs-word-feedback-remember");
    localStorage.setItem("bs-word-feedback-profile", '{"area":"pankow"}');
    const fresh = await import("@stores/wordFeedback.ts");
    expect(fresh.$profile.get()).toEqual({});
    expect(localStorage.getItem("bs-word-feedback-profile")).toBeNull();
  });

  it("writes the profile to the browser only while remember is on", async () => {
    vi.resetModules();
    localStorage.clear();
    const fresh = await import("@stores/wordFeedback.ts");
    fresh.$profile.set({ area: "pankow" });
    expect(localStorage.getItem("bs-word-feedback-profile")).toBeNull();
    fresh.setRemember(true);
    expect(JSON.parse(localStorage.getItem("bs-word-feedback-profile") as string)).toEqual({
      area: "pankow",
    });
    fresh.$profile.set({ age: "30-39", area: "pankow" });
    expect(localStorage.getItem("bs-word-feedback-profile")).toContain("30-39");
    fresh.setRemember(false);
    expect(localStorage.getItem("bs-word-feedback-profile")).toBeNull();
    expect(localStorage.getItem("bs-word-feedback-remember")).toBeNull();
  });
});

describe("nextStep", () => {
  it.each([
    [{}, "area"],
    [{ area: null }, "origin"],
    [{ area: "pankow" }, "locality"],
    [{ area: "pankow", locality: null }, "origin"],
    [{ area: "pankow", locality: "prenzlauer-berg" }, "origin"],
    [{ area: "brandenburg" }, "origin"],
    [{ area: "elsewhere" }, "origin"],
    [{ area: "pankow", locality: null, origin: "grewUp" }, "half"],
    [{ area: null, origin: "movedOver10" }, "age"],
    // Woanders: no half question, even for someone who grew up there.
    [{ area: "elsewhere", origin: "grewUp" }, "age"],
    [{ area: "brandenburg", origin: "grewUp" }, "age"],
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
  it("ignores a late response for a previous word", async () => {
    let release!: (v: unknown) => void;
    const other = { ...state, totals: { ...state.totals, like: 7 } };
    const f = vi
      .fn()
      .mockReturnValueOnce(new Promise((r) => (release = r)))
      .mockResolvedValueOnce(ok(other));
    vi.stubGlobal("fetch", f);
    const a = loadFeedback(401);
    await loadFeedback(402);
    release(ok());
    await a;
    expect($feedback.get()).toEqual(other);
  });
  it("shares the in-flight request between concurrent callers", async () => {
    let release!: (v: unknown) => void;
    const f = vi.fn().mockReturnValue(new Promise((r) => (release = r)));
    vi.stubGlobal("fetch", f);
    const a = loadFeedback(501);
    let secondDone = false;
    const b = loadFeedback(501).then(() => (secondDone = true));
    await Promise.resolve();
    expect(secondDone).toBe(false);
    release(ok());
    await Promise.all([a, b]);
    expect(f).toHaveBeenCalledTimes(1);
    expect($feedback.get()).toEqual(state);
  });
  it("a PATCH state that lands during the GET is not overwritten by the late GET", async () => {
    let release!: (v: unknown) => void;
    const voted = { ...state, mine: { reaction: "like" } };
    const f = vi
      .fn()
      .mockReturnValueOnce(new Promise((r) => (release = r)))
      .mockResolvedValueOnce(ok(voted));
    vi.stubGlobal("fetch", f);
    const load = loadFeedback(601);
    expect(await sendFeedback(601, { reaction: "like" })).toBe(true);
    release(ok()); // pre-vote state
    await load;
    expect($feedback.get()).toEqual(voted);
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
    await loadFeedback(1);
    $feedback.set(null);
    expect(await sendFeedback(1, { reaction: "like" })).toBe(true);
    expect($feedback.get()).toEqual(state);
  });
  it("failure keeps $feedback and toasts", async () => {
    $feedback.set(state);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await sendFeedback(1, { reaction: "like" })).toBe(false);
    expect($feedback.get()).toBe(state);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hat nich jeklappt, versuch's nochma." }),
    );
  });
  it("a caller's fallback message replaces the generic one, the server's reason still wins", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await sendFeedback(1, { reaction: "like" }, { fallbackMessage: "Ditt hat nich jeklappt." });
    expect(toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "Ditt hat nich jeklappt." }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ json: async () => ({ error: "Zu oft." }), ok: false, status: 429 }),
    );
    await sendFeedback(1, { reaction: "like" }, { fallbackMessage: "Ditt hat nich jeklappt." });
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ message: "Zu oft." }));
  });
  it("silent callers get the failure back without a toast, on both failure paths", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await sendFeedback(1, { usage: "say" }, { silent: true })).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ error: "Zu oft." }), ok: false, status: 429 }),
    );
    expect(await sendFeedback(1, { usage: "say" }, { silent: true })).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
  it("a silent 429 hands the server text to $sendError instead of a toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "Jenug jestimmt für heute." }),
        ok: false,
        status: 429,
      }),
    );
    expect(await sendFeedback(1, { usage: "say" }, { silent: true })).toBe(false);
    expect($sendError.get()).toBe("Jenug jestimmt für heute.");
    expect(toast).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    expect(await sendFeedback(1, { usage: "say" }, { silent: true })).toBe(true);
    expect($sendError.get()).toBeNull();
  });
  it("a silent network error sets $sendError and every call resets it first", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await sendFeedback(1, { usage: "say" }, { silent: true })).toBe(false);
    expect($sendError.get()).toBeNull(); // no server reason: the caller shows its own generic text
    $sendError.set("old");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    await sendFeedback(1, { reaction: "like" }); // a non-silent call resets it as well
    expect($sendError.get()).toBeNull();
  });
  it("a 2xx with an unreadable body is not a failed vote and does not toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => {
          throw new SyntaxError("bad");
        },
        ok: true,
        status: 200,
      }),
    );
    expect(await sendFeedback(1, { reaction: "like" })).toBe(true);
    expect(toast).not.toHaveBeenCalled();
  });
  it("non-ok response counts as failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}), ok: false }));
    expect(await sendFeedback(1, { usage: "say" })).toBe(false);
    expect(toast).toHaveBeenCalledTimes(1);
  });
  it("shows the server's message for any non-ok answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "Is jespeichert, aber die Zahlen wollten nich laden." }),
        ok: false,
        status: 502,
      }),
    );
    expect(await sendFeedback(1, { usage: "say" })).toBe(false);
    expect(toast).toHaveBeenCalledWith({
      message: "Is jespeichert, aber die Zahlen wollten nich laden.",
      status: "error",
    });
  });
  it("applies only the newest of two overlapping answers", async () => {
    await loadFeedback(1);
    const older = { ...state, mine: { reaction: "like" } };
    const newer = { ...state, mine: { reaction: "like", usage: "say" } };
    let slow!: (v: unknown) => void;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(new Promise((r) => (slow = r)))
      .mockResolvedValueOnce(ok(newer));
    vi.stubGlobal("fetch", fetchMock);
    const first = sendFeedback(1, { reaction: "like" });
    await sendFeedback(1, { usage: "say" });
    slow(ok(older));
    await first;
    expect($feedback.get()).toEqual(newer);
  });
  it("applies an answer after a failed load (the word is still the one shown)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await loadFeedback(5);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    expect(await sendFeedback(5, { reaction: "like" })).toBe(true);
    expect($feedback.get()).toEqual(state);
  });
  it("logs a failed load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await loadFeedback(6);
    expect(console.error).toHaveBeenCalled();
  });
  it("shows the server's message when the daily cap answers 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "Jenug jestimmt für heute." }),
        ok: false,
        status: 429,
      }),
    );
    expect(await sendFeedback(1, { usage: "say" })).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Jenug jestimmt für heute." }),
    );
  });
  it("ignores a response after the next word's GET failed", async () => {
    let release!: (v: unknown) => void;
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockReturnValueOnce(new Promise((r) => (release = r)))
      .mockRejectedValueOnce(new Error("down"));
    vi.stubGlobal("fetch", f);
    await loadFeedback(501);
    const pending = sendFeedback(501, { reaction: "like" });
    await loadFeedback(502);
    release(ok());
    await pending;
    expect($feedback.get()).toBeNull();
  });
  it("ignores a response when another word is loaded meanwhile", async () => {
    let release!: (v: unknown) => void;
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockReturnValueOnce(new Promise((r) => (release = r)));
    vi.stubGlobal("fetch", f);
    await loadFeedback(301);
    const pending = sendFeedback(301, { reaction: "like" });
    f.mockResolvedValueOnce(ok(state));
    await loadFeedback(302);
    release(ok({ ...state, totals: { ...state.totals, like: 99 } }));
    await pending;
    expect($feedback.get()).toEqual(state);
  });
});

describe("answerUsage", () => {
  it("drops a half without origin grewUp from an in-memory profile", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    $profile.set({ half: "east", origin: "movedOver10" });
    await answerUsage(5, "say");
    expect(JSON.parse(f.mock.calls[0][1].body)).not.toHaveProperty("half");
  });
  it("sends origin grewUp together with half", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    $profile.set({ half: "east", origin: "grewUp" });
    await answerUsage(5, "know");
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ half: "east", origin: "grewUp" });
  });
  it("sends the Locality together with its area", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", f);
    $profile.set({ area: "pankow", locality: "prenzlauer-berg" });
    await answerUsage(5, "say");
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({
      area: "pankow",
      locality: "prenzlauer-berg",
    });
  });
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

describe("deleteAllFeedback", () => {
  it("sends DELETE, forgets the profile and reloads the word", async () => {
    $profile.set({ area: "pankow" });
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);
    expect(await deleteAllFeedback(7)).toBe(true);
    expect(fetchMock.mock.calls[0]).toEqual(["/api/word-feedback", { method: "DELETE" }]);
    expect($profile.get()).toEqual({});
    expect(fetchMock.mock.calls[1][0]).toBe("/api/word-feedback?word=7");
    vi.unstubAllGlobals();
  });

  it("keeps everything and toasts when the delete fails", async () => {
    $profile.set({ area: "pankow" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    expect(await deleteAllFeedback(7)).toBe(false);
    expect($profile.get()).toEqual({ area: "pankow" });
    expect(toast).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
