// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("astro:env/server", () => ({
  WAKAPI_API_KEY: "test-api-key",
}));

vi.mock("astro:env/client", () => ({
  WAKAPI_HOST: "https://wakapi.example.com",
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(() => {
      throw new Error("ENOENT");
    }),
    writeFileSync: vi.fn(),
  };
});

describe("WakapiStats.astro", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("renders hours when fetch returns valid data", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [{ key: "berliner-schnauze", total: 7200 }],
      }),
    } as unknown as Response);

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).toContain("2+");
    expect(result).toContain("Std. Coding-Zeit");
  });

  it("renders nothing when fetch returns no matching project", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ projects: [] }),
    } as unknown as Response);

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).not.toContain("Std. Coding-Zeit");
  });

  it("renders nothing when fetch returns ok=false", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as unknown as Response);

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).not.toContain("Std. Coding-Zeit");
  });

  it("renders nothing when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).not.toContain("Std. Coding-Zeit");
  });

  it("uses cached data when cache is fresh", async () => {
    const { readFileSync } = await import("node:fs");
    vi.mocked(readFileSync).mockReturnValueOnce(
      JSON.stringify({ fetchedAt: Date.now(), hours: 10, minutes: 30 }) as unknown as Buffer,
    );
    global.fetch = vi.fn();

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).toContain("10+");
    expect(result).toContain("Std. Coding-Zeit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles nanosecond-scale total by converting to seconds", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [{ key: "berliner-schnauze", total: 3600 * 1e9 }],
      }),
    } as unknown as Response);

    const { default: WakapiStats } = await import("@components/WakapiStats.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WakapiStats, {});
    expect(result).toContain("1+");
    expect(result).toContain("Std. Coding-Zeit");
  });
});
