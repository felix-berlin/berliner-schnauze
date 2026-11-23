import { agoLabel } from "@lib/story.ts";
import { describe, expect, it } from "vitest";

const now = Date.parse("2026-11-22T12:00:00Z");
const ago = (ms: number) => agoLabel(new Date(now - ms).toISOString(), now);

describe("agoLabel", () => {
  it("reads like the mock, never finer than a minute", () => {
    expect(ago(5_000)).toBe("vor 1 Minute");
    expect(ago(3 * 3_600_000)).toBe("vor 3 Stunden");
    expect(ago(3 * 86_400_000)).toBe("vor 3 Tagen");
    expect(ago(14 * 86_400_000)).toBe("vor 2 Wochen");
    expect(ago(400 * 86_400_000)).toBe("vor 1 Jahr");
  });
});
