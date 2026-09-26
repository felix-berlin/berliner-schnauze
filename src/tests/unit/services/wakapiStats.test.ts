import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchJson, readFileSync, writeFileSync } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("@services/fetchJson.ts", () => ({ fetchJson }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const mocked = { ...actual, readFileSync, writeFileSync };
  return { ...mocked, default: mocked };
});
vi.mock("astro:env/client", () => ({ WAKAPI_HOST: "https://wakapi.test" }));

const mockKey = (key: string) => vi.doMock("astro:env/server", () => ({ WAKAPI_API_KEY: key }));

const loadStats = async () => {
  const { getWakapiStats } = await import("@services/wakapiStats.ts");
  return getWakapiStats();
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockKey("secret");
  readFileSync.mockImplementation(() => {
    throw new Error("ENOENT");
  });
});

describe("getWakapiStats", () => {
  it("returns zeros without an API key", async () => {
    mockKey("");

    expect(await loadStats()).toEqual({ hours: 0, minutes: 0 });
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("fetches, converts total seconds and writes the cache", async () => {
    fetchJson.mockResolvedValue({ data: { total_seconds: 3 * 3600 + 25 * 60 + 10 } });

    expect(await loadStats()).toEqual({ hours: 3, minutes: 25 });
    expect(fetchJson).toHaveBeenCalledWith(
      "https://wakapi.test/api/compat/wakatime/v1/users/current/all_time_since_today?project=berliner-schnauze",
      { Authorization: `Bearer ${Buffer.from("secret").toString("base64")}` },
      "Wakapi stats",
    );
    const written = JSON.parse(writeFileSync.mock.calls[0]?.[1] as string);
    expect(written).toMatchObject({ hours: 3, minutes: 25 });
    expect(written.failed).toBeUndefined();
  });

  it("caches a failure and returns zeros when the request fails", async () => {
    fetchJson.mockResolvedValue(undefined);

    expect(await loadStats()).toEqual({ hours: 0, minutes: 0 });
    expect(JSON.parse(writeFileSync.mock.calls[0]?.[1] as string)).toMatchObject({ failed: true });
  });

  it("serves a fresh cache entry without fetching", async () => {
    readFileSync.mockReturnValue(JSON.stringify({ fetchedAt: Date.now(), hours: 7, minutes: 1 }));

    expect(await loadStats()).toEqual({ hours: 7, minutes: 1 });
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("refetches once a cached failure is older than its short TTL", async () => {
    readFileSync.mockReturnValue(
      JSON.stringify({
        failed: true,
        fetchedAt: Date.now() - 10 * 60 * 1000,
        hours: 0,
        minutes: 0,
      }),
    );
    fetchJson.mockResolvedValue({ data: { total_seconds: 120 } });

    expect(await loadStats()).toEqual({ hours: 0, minutes: 2 });
  });

  it("ignores cache write errors", async () => {
    writeFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    fetchJson.mockResolvedValue({ data: {} });

    expect(await loadStats()).toEqual({ hours: 0, minutes: 0 });
  });

  it("resolves only once per module instance", async () => {
    fetchJson.mockResolvedValue({ data: { total_seconds: 60 } });
    const { getWakapiStats } = await import("@services/wakapiStats.ts");

    await getWakapiStats();
    await getWakapiStats();
    expect(fetchJson).toHaveBeenCalledOnce();
  });
});
