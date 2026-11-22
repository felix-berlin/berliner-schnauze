// @vitest-environment jsdom
import { ownSubmissions, rememberStoryKey, rememberSubmission } from "@lib/ownSubmissions.ts";
import { beforeEach, describe, expect, it } from "vitest";

const DAY = 24 * 60 * 60_000;

describe("ownSubmissions", () => {
  beforeEach(() => localStorage.clear());

  it("remembers a submission per word without the name, newest first", () => {
    rememberSubmission("schrippe", "example", "Zwee Schrippen, bitte.", 1000);
    rememberSubmission("schrippe", "fact", "Herkunft unklar.", 2000);
    rememberSubmission("kiez", "related", "Viertel", 3000);
    expect(ownSubmissions("schrippe", 4000).map((s) => s.type)).toEqual(["fact", "example"]);
    expect(ownSubmissions("kiez", 4000)).toHaveLength(1);
    expect(localStorage.getItem("bs-own-submissions")).not.toMatch(/name|mail/i);
  });

  it("cuts the preview to 60 characters", () => {
    rememberSubmission("schrippe", "example", "x".repeat(200), 1000);
    expect(ownSubmissions("schrippe", 1001)[0]?.preview).toHaveLength(60);
  });

  it("drops entries older than 14 days", () => {
    rememberSubmission("schrippe", "example", "alt", 0);
    expect(ownSubmissions("schrippe", 14 * DAY - 1)).toHaveLength(1);
    expect(ownSubmissions("schrippe", 14 * DAY)).toHaveLength(0);
  });

  it("survives garbage in the storage", () => {
    localStorage.setItem("bs-own-submissions", "{nope");
    expect(ownSubmissions("schrippe")).toEqual([]);
    rememberSubmission("schrippe", "example", "ok");
    expect(ownSubmissions("schrippe")).toHaveLength(1);
  });

  it("keeps story edit keys per word", () => {
    rememberStoryKey("schrippe", "abc", 5);
    expect(JSON.parse(localStorage.getItem("bs-story-keys") ?? "{}")).toEqual({
      schrippe: [{ at: 5, key: "abc" }],
    });
  });
});
