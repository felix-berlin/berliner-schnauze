import { pickNetwork } from "@lib/wordNetwork.ts";
import { describe, expect, it } from "vitest";

// Invented data only.
const entry = (label: string, relation?: string) => ({ label, ...(relation && { relation }) });

describe("pickNetwork", () => {
  it("puts the four most important entries in the net and the rest in the list", () => {
    const { net, rest } = pickNetwork([
      entry("Zeta", "redewendung"),
      entry("Beta", "verwandt"),
      entry("Alpha", "verwandt"),
      entry("Gamma", "gegenteil"),
      entry("Delta", "gleich"),
      entry("Epsilon", "gleich"),
    ]);
    expect(net.map((r) => r.label)).toEqual(["Delta", "Epsilon", "Gamma", "Alpha"]);
    expect(rest.map((r) => r.label)).toEqual(["Beta", "Zeta"]);
  });

  it("ranks an unknown relation like the verwandt label it gets", () => {
    const { net } = pickNetwork([
      entry("Z", "redewendung"),
      entry("B"),
      entry("A", "verwandt"),
      entry("G", "gleich"),
    ]);
    expect(net.map((r) => r.label)).toEqual(["G", "A", "B", "Z"]);
  });

  it("keeps everything in the net up to four entries and sorts unknown relations last", () => {
    const { net, rest } = pickNetwork([entry("B"), entry("A", "verwandt")]);
    expect(net.map((r) => r.label)).toEqual(["A", "B"]);
    expect(rest).toEqual([]);
  });
});
