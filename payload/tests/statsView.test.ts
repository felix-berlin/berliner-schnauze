import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import StatsView from "../src/components/StatsView";
import { statsParams } from "../src/lib/statsParams";
import { getTestPayload } from "./helpers/payload";

// The admin UI packages import CSS, which vitest cannot load; the view returns before it touches them.
vi.mock("@payloadcms/ui", () => ({ Gutter: () => null }));
vi.mock("@payloadcms/next/templates", () => ({ DefaultTemplate: () => null }));

let payload: Payload;
beforeAll(async () => {
  payload = await getTestPayload();
}, 60_000);
afterAll(() => undefined);

const props = (user: unknown, searchParams = {}) =>
  ({
    initPageResult: {
      req: { user, payload, i18n: {} },
      locale: undefined,
      permissions: {},
      visibleEntities: {},
    },
    params: {},
    searchParams,
  }) as never;

describe("StatsView", () => {
  it("renders nothing without a login", async () => {
    expect(await StatsView(props(null))).toBeNull();
  });
});

describe("statsParams", () => {
  it("falls back to the last 30 days and the default series for garbage", () => {
    const p = statsParams(
      { von: "x", reihen: "views,unbekannt,audio", ansicht: "kuchen", verteilung: "?" },
      "2026-11-19",
    );
    expect(p.range).toEqual({ from: "2026-10-21", to: "2026-11-19" });
    expect(p.series).toEqual(["views", "audio"]);
    expect(p.view).toBe("linie");
    expect(p.split).toBe("reaktion");
  });

  it("defaults to the views series when none is valid", () => {
    expect(statsParams({ reihen: "nix" }, "2026-11-19").series).toEqual(["views"]);
  });

  it("accepts the flaeche view and the nutzung split", () => {
    const p = statsParams({ ansicht: "flaeche", verteilung: "nutzung" }, "2026-11-19");
    expect([p.view, p.split]).toEqual(["flaeche", "nutzung"]);
  });
});
