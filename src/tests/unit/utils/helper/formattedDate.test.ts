import { describe, it, expect } from "vitest";
import { formattedDate } from "@utils/helpers";

describe("formattedDate", () => {
  it("should return undefined if no date is provided", () => {
    expect(formattedDate("")).toBeUndefined();
  });

  it("should return the date in the correct format for de-DE locale", () => {
    const date = "2022-01-01";
    expect(formattedDate(date)).toBe("1. Januar 2022");
  });

  it("should return the date in the correct format for en-US locale", () => {
    const date = "2022-01-01";
    expect(formattedDate(date, "en-US")).toBe("January 1, 2022");
  });
});
