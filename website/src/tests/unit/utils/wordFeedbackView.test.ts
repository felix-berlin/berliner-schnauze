import { plural, profilePatch, progressSegments } from "@utils/wordFeedbackView";
import { describe, expect, it } from "vitest";

describe("progressSegments", () => {
  const all = ["usage", "area", "locality", "age"];
  it("marks done, current, open and skipped steps", () => {
    expect(progressSegments(all, ["usage", "area", "age"], "area")).toEqual([
      { state: "done", step: "usage" },
      { state: "current", step: "area" },
      { state: "skipped", step: "locality" },
      { state: "open", step: "age" },
    ]);
  });
  it("marks every active step done at the end", () => {
    expect(progressSegments(all, all, "done").every((s) => s.state === "done")).toBe(true);
  });
});

describe("edge cases", () => {
  it("plural: 0 and 2 are plural, 1 is singular", () => {
    expect(plural(0)).toBe("0 Stimmen");
    expect(plural(1)).toBe("1 Stimme");
    expect(plural(2)).toBe("2 Stimmen");
  });
  it("progressSegments: a current step outside active marks nothing as done before it", () => {
    const seg = progressSegments(["a", "b", "c"], ["a", "c"], "b");
    expect(seg.map((x) => x.state)).toEqual(["done", "skipped", "open"]);
  });
});

describe("profilePatch", () => {
  const ctx = { area: "pankow", hadLocality: false };
  it("sends the plain answer", () => {
    expect(profilePatch("age", "30s", ctx)).toEqual({ age: "30s" });
  });
  it("drops the half unless the origin is grewUp", () => {
    expect(profilePatch("origin", "moved", ctx)).toEqual({ half: null, origin: "moved" });
    expect(profilePatch("origin", "grewUp", ctx)).toEqual({ origin: "grewUp" });
  });
  it("a half comes with origin grewUp", () => {
    expect(profilePatch("half", "east", ctx)).toEqual({ half: "east", origin: "grewUp" });
    expect(profilePatch("half", null, ctx)).toEqual({ half: null });
  });
  it("a locality comes with its area", () => {
    expect(profilePatch("locality", "kiez", ctx)).toEqual({ area: "pankow", locality: "kiez" });
    expect(profilePatch("locality", null, ctx)).toEqual({ locality: null });
  });
  it("a new area clears an old locality; outside Berlin it also clears the half", () => {
    expect(profilePatch("area", "mitte", { ...ctx, hadLocality: true })).toEqual({
      area: "mitte",
      locality: null,
    });
    expect(profilePatch("area", "mitte", ctx)).toEqual({ area: "mitte" });
    expect(profilePatch("area", "brandenburg", ctx)).toEqual({ area: "brandenburg", half: null });
    expect(profilePatch("area", "elsewhere", { ...ctx, hadLocality: true })).toEqual({
      area: "elsewhere",
      half: null,
      locality: null,
    });
  });
});
