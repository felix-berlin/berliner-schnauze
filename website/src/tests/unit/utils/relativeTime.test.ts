import { relativeTime } from "@utils/relativeTime";
import { describe, expect, it } from "vitest";

const now = new Date("2026-11-21T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);
const DAY = 86_400;

describe("relativeTime", () => {
  it("counts in days and weeks with numbers by default", () => {
    expect(relativeTime(ago(3 * 3600), now)).toBe("heute");
    expect(relativeTime(ago(DAY), now)).toBe("vor 1 Tag");
    expect(relativeTime(ago(2 * DAY), now)).toBe("vor 2 Tagen");
    expect(relativeTime(ago(7 * DAY), now)).toBe("vor 1 Woche");
    expect(relativeTime(ago(21 * DAY), now)).toBe("vor 3 Wochen");
    expect(relativeTime(ago(40 * DAY), now)).toBe("vor 1 Monat");
  });

  it("keeps the comment wording with minutes, hours and numeric auto", () => {
    const opts = { numeric: "auto", precise: true } as const;
    expect(relativeTime(ago(10), now, opts)).toBe("jetzt");
    expect(relativeTime(ago(2 * 3600), now, opts)).toBe("vor 2 Stunden");
    expect(relativeTime(ago(DAY), now, opts)).toBe("gestern");
    expect(relativeTime(ago(14 * DAY), now, opts)).toBe("vor 14 Tagen");
  });
});
