import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  it("returns the lite asset's download URL", async () => {
    const release = {
      assets: [
        { browser_download_url: "https://example.com/full", name: "berlinerisch-full-v3.52.0.apkg" },
        { browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v3.52.0.apkg" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, release)));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBe("https://example.com/lite");
  });

  it("returns undefined when no lite asset is attached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, { assets: [] })));
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

  it("requests the repo's latest release with the correct Accept header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, { assets: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/felix-berlin/berliner-schnauze/releases/latest");
    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/vnd.github+json");
  });

  it("memoizes the result across calls within the same module instance", async () => {
    const release = {
      assets: [{ browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v1.apkg" }],
    };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, release));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();
    await getLiteDeckDownloadUrl();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
