import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ GITHUB_API_TOKEN: "" }));

function makeResponse(ok: boolean, body: unknown): Response {
  return { json: vi.fn().mockResolvedValue(body), ok } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getLiteDeckDownloadUrl", () => {
  it("returns the lite asset's download URL from the newest release", async () => {
    const releases = [
      {
        assets: [
          { browser_download_url: "https://example.com/full", name: "berlinerisch-full-v3.52.0.apkg" },
          { browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v3.52.0.apkg" },
        ],
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, releases)));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBe("https://example.com/lite");
  });

  it("falls back to an older release if the newest one has no lite asset yet", async () => {
    const releases = [
      { assets: [{ browser_download_url: "https://example.com/full-new", name: "berlinerisch-full-v3.53.0.apkg" }] },
      { assets: [{ browser_download_url: "https://example.com/lite-old", name: "berlinerisch-lite-v3.52.0.apkg" }] },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, releases)));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBe("https://example.com/lite-old");
  });

  it("returns undefined when no recent release has a lite asset", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, [{ assets: [] }, { assets: [] }])));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("returns undefined on a non-ok response", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("returns undefined on a network error", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("requests the repo's recent releases with the correct Accept header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, []));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/felix-berlin/berliner-schnauze/releases?per_page=5");
    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/vnd.github+json");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("includes an Authorization header when GITHUB_API_TOKEN is configured", async () => {
    vi.doMock("astro:env/server", () => ({ GITHUB_API_TOKEN: "ghp_test_token" }));
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, []));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer ghp_test_token");
  });

  it("memoizes the result across calls within the same module instance", async () => {
    const releases = [{ assets: [{ browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v1.apkg" }] }];
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, releases));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();
    await getLiteDeckDownloadUrl();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
