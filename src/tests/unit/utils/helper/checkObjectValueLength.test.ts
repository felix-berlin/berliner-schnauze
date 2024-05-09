import { describe, it, expect } from "vitest";
import { checkObjectValueLength } from "@utils/helpers";

describe("checkObjectValueLength", () => {
  it("should return true if all values in the object have a length of 0", () => {
    const testObject = {
      key1: "",
      key2: [],
      key3: {},
    };
    expect(checkObjectValueLength(testObject)).toBe(true);
  });

  it("should return false if any value in the object has a length greater than 0", () => {
    const testObject = {
      key1: "value",
      key2: [1, 2, 3],
      key3: { subKey: "value" },
    };
    expect(checkObjectValueLength(testObject)).toBe(false);
  });

  it("should return false if any value in the object is a number", () => {
    const testObject = {
      key1: 0,
    };
    expect(checkObjectValueLength(testObject)).toBe(false);
  });

  it("should return false if any value in the object is a boolean", () => {
    const testObject = {
      key1: false,
    };
    expect(checkObjectValueLength(testObject)).toBe(false);
  });

  it("should return true if any value in the object is null", () => {
    const testObject = {
      key1: null,
    };
    expect(checkObjectValueLength(testObject)).toBe(true);
  });

  it("should return true if any value in the object is undefined", () => {
    const testObject = {
      key1: undefined,
    };
    expect(checkObjectValueLength(testObject)).toBe(true);
  });
});
