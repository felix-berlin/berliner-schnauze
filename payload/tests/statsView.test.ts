import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StatsData } from "../src/lib/statsTypes";

import StatsView from "../src/components/StatsView";
import { METRICS } from "../src/lib/statsMetrics";
import { loadStats } from "../src/lib/statsQueries";

// The admin UI packages import CSS, which vitest cannot load; these stand-ins just render their children.
vi.mock("@payloadcms/ui", () => ({ Gutter: ({ children }: { children: unknown }) => children }));
vi.mock("@payloadcms/next/templates", () => ({
  DefaultTemplate: ({ children }: { children: unknown }) => children,
}));
vi.mock("../src/components/stats/StatsCharts", () => ({ StatsCharts: () => null }));
vi.mock("../src/lib/statsQueries", () => ({ loadStats: vi.fn<() => unknown>() }));

const data = (views: number): StatsData => ({
  daily: Object.fromEntries(METRICS.map((m) => [m, {}])) as StatsData["daily"],
  totals: Object.fromEntries(
    METRICS.map((m) => [m, m === "views" ? views : 0]),
  ) as StatsData["totals"],
  reactionSplit: { like: 0, dislike: 0, say: 0, know: 0, never: 0 },
  topViewed: [{ id: 7, berlinerisch: "Kiez", slug: "kiez", value: 12 }],
  topLiked: [{ id: 8, berlinerisch: "Bolle", slug: "bolle", value: 90, votes: 14 }],
  topSay: [],
});

const logger = { error: vi.fn<(entry: Record<string, unknown>) => void>() };
const props = (user: unknown, searchParams = {}) =>
  ({
    initPageResult: {
      req: { user, payload: { logger }, i18n: {} },
      locale: undefined,
      permissions: {},
      visibleEntities: {},
    },
    params: {},
    searchParams,
  }) as never;
const render = async (user: unknown, searchParams = {}) =>
  renderToStaticMarkup((await StatsView(props(user, searchParams))) as never);

const load = vi.mocked(loadStats);
beforeEach(() => {
  load.mockReset();
  logger.error.mockReset();
});

describe("StatsView access", () => {
  it("sends a visitor without a login to the login and queries nothing", async () => {
    await expect(StatsView(props(null))).rejects.toMatchObject({
      digest: expect.stringContaining("/admin/login"),
    });
    expect(load).not.toHaveBeenCalled();
  });
});

describe("StatsView", () => {
  it("shows tiles and the top lists, and loads the previous range without top lists", async () => {
    load.mockResolvedValueOnce(data(150)).mockResolvedValueOnce(data(100));
    const html = await render({ id: 1 });
    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[0][2]).toBeUndefined();
    expect(load.mock.calls[1][2]).toEqual({ tops: false });
    expect(html).toContain("+50 %");
    expect(html).toContain("Kiez");
    expect(html).toContain("90 % · 14 Stimmen");
    expect(html).not.toContain("stats__notice");
  });

  it("tells the user when the asked range was changed", async () => {
    load.mockResolvedValue(data(1));
    const html = await render({ id: 1 }, { von: "kaputt", bis: "2026-11-01" });
    expect(html).toContain("stats__notice");
    expect(html).toContain("30 Tage");
  });

  it("still shows the page when only the previous range fails, with no comparison", async () => {
    load.mockResolvedValueOnce(data(150)).mockRejectedValueOnce(new Error("boom"));
    const html = await render({ id: 1 });
    expect(html).toContain("Kiez");
    expect(html).not.toContain("+50 %");
    expect(html).not.toContain("nicht verfügbar");
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toMatchObject({ msg: "[stats] admin stats failed" });
  });

  it("shows a message and logs the range when the current range fails", async () => {
    load.mockRejectedValue(new Error("stats query word_stats failed"));
    const html = await render({ id: 1 });
    expect(html).toContain("nicht verfügbar");
    expect(html).not.toContain("Kiez");
    expect(logger.error.mock.calls[0][0].range).toEqual(
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
  });

  it("shows no sign on a 0 % change", async () => {
    load.mockResolvedValue(data(5));
    const html = await render({ id: 1 });
    expect(html).toContain("0 %");
    expect(html).not.toContain("stats__delta--up");
    expect(html).not.toContain("stats__delta--down");
  });
});
