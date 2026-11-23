import { authorTagOf, voterKey } from "@services/payload/comments.ts";
import { describe, expect, it } from "vitest";

describe("visitor hashes", () => {
  it("voterKey is a fixed, prefixed sha256", () => {
    expect(voterKey("v-1")).toBe(
      "90124b131dbe7b45d3dc23d73e27e2c027d3b0cdf62930e21ad6a124623f38f2",
    );
  });

  it("authorTagOf is 16 hex chars and differs per word", () => {
    expect(authorTagOf("v-1", 1)).toMatch(/^[0-9a-f]{16}$/);
    expect(authorTagOf("v-1", 1)).not.toBe(authorTagOf("v-1", 2));
  });
});
