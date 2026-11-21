import { describe, expect, it } from "vitest";

import { METRICS } from "../src/lib/statsMetrics";
import { statsHref, statsParams } from "../src/lib/statsParams";

const today = "2026-11-19";

describe("statsParams", () => {
  it("falls back to the last 30 days and the default series for garbage", () => {
    const p = statsParams(
      { von: "x", bis: "y", reihen: "views,unbekannt,audio", ansicht: "kuchen", verteilung: "?" },
      today,
    );
    expect(p.range).toEqual({ from: "2026-10-21", to: today });
    expect(p.notice).toMatch(/ungültig/);
    expect(p.series).toEqual(["views", "audio"]);
    expect(p.view).toBe("linie");
    expect(p.split).toBe("reaktion");
  });

  it("has no notice without von/bis", () => {
    expect(statsParams({}, today).notice).toBeNull();
  });

  it("defaults to the views series when none is valid, empty or repeated", () => {
    expect(statsParams({ reihen: "nix" }, today).series).toEqual(["views"]);
    expect(statsParams({ reihen: "" }, today).series).toEqual(["views"]);
    expect(statsParams({ reihen: ["audio", "shares"] }, today).series).toEqual(["views"]);
  });

  it("keeps the canonical order and drops duplicates", () => {
    expect(statsParams({ reihen: "audio,views,audio" }, today).series).toEqual(["views", "audio"]);
  });

  it("accepts the flaeche view and the nutzung split", () => {
    const p = statsParams({ ansicht: "flaeche", verteilung: "nutzung" }, today);
    expect([p.view, p.split]).toEqual(["flaeche", "nutzung"]);
  });
});

describe("statsHref", () => {
  it("is the inverse of statsParams (the German URL keys cannot drift apart)", () => {
    const p = statsParams(
      {
        von: "2026-11-01",
        bis: "2026-11-07",
        reihen: METRICS.join(","),
        ansicht: "flaeche",
        verteilung: "nutzung",
      },
      today,
    );
    const query = Object.fromEntries(new URL(statsHref(p), "http://x").searchParams);
    expect(statsParams(query, today)).toEqual(p);
  });

  it("applies a change on top of the current params", () => {
    const p = statsParams({}, today);
    const url = new URL(statsHref(p, { ansicht: "flaeche", reihen: "audio" }), "http://x");
    expect(url.pathname).toBe("/admin/stats");
    expect(url.searchParams.get("ansicht")).toBe("flaeche");
    expect(url.searchParams.get("reihen")).toBe("audio");
    expect(url.searchParams.get("bis")).toBe(today);
  });
});
