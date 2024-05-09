import { describe, it, expect } from "vitest";
import { checkObjectValues } from "@utils/helpers";

describe("checkObjectValues", () => {
  it("should return true when all object values match the checkFor value", () => {
    const testObject = {
      key1: false,
      key2: false,
      key3: false,
    };
    expect(checkObjectValues(testObject, false)).toBe(true);
  });

  it("should return false when not all object values match the checkFor value", () => {
    const testObject = {
      key1: false,
      key2: true,
      key3: false,
    };
    expect(checkObjectValues(testObject, false)).toBe(false);
  });

  it("should return true when object is empty", () => {
    const testObject = {};
    expect(checkObjectValues(testObject, false)).toBe(true);
  });

  it("should return true when checkFor value is not provided and all object values are false", () => {
    const testObject = {
      key1: false,
      key2: false,
      key3: false,
    };
    expect(checkObjectValues(testObject)).toBe(true);
  });

  it("should return false when checkFor value is not provided and not all object values are false", () => {
    const testObject = {
      key1: false,
      key2: true,
      key3: false,
    };
    expect(checkObjectValues(testObject)).toBe(false);
  });
});
