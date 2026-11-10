// @vitest-environment jsdom
import { BON_FRAGMENT_SCRIPT } from "@utils/bonFragment.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const run = (hash: string) => {
  history.replaceState(null, "", "/games/berliner-oder-nicht?x=1" + hash);
  // oxlint-disable-next-line typescript/no-implied-eval -- runs the shipped inline script source
  new Function(BON_FRAGMENT_SCRIPT)();
};

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("BON_FRAGMENT_SCRIPT", () => {
  it("stores a valid code and strips the hash", () => {
    run("#code=K7QD-M2X9-ZT4B");
    expect(sessionStorage.getItem("bonRedeem")).toBe("K7QD-M2X9-ZT4B");
    expect(location.hash).toBe("");
    expect(location.search).toBe("?x=1");
  });

  it.each(["#code=%", "#code=%E0%A4", "#code=" + "A".repeat(10_000), "#code="])(
    "drops %# but still strips the hash",
    (hash) => {
      run(hash);
      expect(sessionStorage.getItem("bonRedeem")).toBeNull();
      expect(location.hash).toBe("");
    },
  );

  it("is a no-op without a hash and keeps the stored value", () => {
    sessionStorage.setItem("bonRedeem", "K7QD-M2X9-ZT4B");
    expect(() => run("")).not.toThrow();
    expect(sessionStorage.getItem("bonRedeem")).toBe("K7QD-M2X9-ZT4B");
  });

  it("leaves other hashes alone", () => {
    run("#something-else");
    expect(location.hash).toBe("#something-else");
    expect(sessionStorage.getItem("bonRedeem")).toBeNull();
  });

  it("strips the hash even when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => run("#code=K7QD-M2X9-ZT4B")).not.toThrow();
    expect(location.hash).toBe("");
  });
});
