import { fetchLeaderboard, reportName } from "@services/bonLeaderboardApi.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());
const stub = (res: Response | Error) =>
  vi.stubGlobal(
    "fetch",
    res instanceof Error ? vi.fn().mockRejectedValue(res) : vi.fn().mockResolvedValue(res),
  );

describe("fetchLeaderboard", () => {
  it("asks for the period, offset and limit and returns the reply", async () => {
    stub(new Response(JSON.stringify({ entries: [], total: 0 })));
    await expect(fetchLeaderboard("month", 25, 25)).resolves.toEqual({ entries: [], total: 0 });
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      "/api/bon/leaderboard?limit=25&offset=25&period=month",
    );
  });

  it("throws on a failed status and on a network error", async () => {
    stub(new Response("{}", { status: 500 }));
    await expect(fetchLeaderboard("week", 0, 25)).rejects.toThrow("nich");
    stub(new Error("offline"));
    await expect(fetchLeaderboard("week", 0, 25)).rejects.toThrow("nich");
  });
});

describe("reportName", () => {
  it("posts the id and accepts the empty 204", async () => {
    stub(new Response(null, { status: 204 }));
    await expect(reportName(7)).resolves.toBeUndefined();
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/api/bon/report-name");
    expect(init?.body).toBe('{"id":7}');
  });

  it.each([
    [400, "Ohne Cookie jeht dett nich."],
    [404, "Spiel nich jefunden."],
    [429, "Zu viele Meldungen."],
  ])("surfaces the server's text and status for %i", async (status, error) => {
    stub(new Response(JSON.stringify({ error }), { status }));
    await expect(reportName(7)).rejects.toMatchObject({ message: error, status });
  });

  it("falls back to a fixed text without a body and on a network error", async () => {
    stub(new Response(null, { status: 429 }));
    await expect(reportName(7)).rejects.toThrow("nich jesendet");
    stub(new Error("offline"));
    await expect(reportName(7)).rejects.toThrow("nich jesendet");
  });
});
