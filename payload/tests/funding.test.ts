import { describe, expect, it } from "vitest";

import { splitFunding } from "../src/lib/funding";

describe("splitFunding", () => {
  it("separates platforms from wallets and groups the chains of one address", () => {
    expect(
      splitFunding([
        { name: "Ko-fi", link: "https://ko-fi.com/x" },
        { name: "Ethereum", adresse: "0xA" },
        { name: "Bitcoin", adresse: "bc1" },
        { name: "Base", adresse: "0xA" },
        { name: "", link: "https://ignored" },
      ]),
    ).toEqual({
      platforms: [{ link: "https://ko-fi.com/x", name: "Ko-fi" }],
      wallets: [
        { address: "0xA", chains: ["Ethereum", "Base"] },
        { address: "bc1", chains: ["Bitcoin"] },
      ],
    });
  });
});
