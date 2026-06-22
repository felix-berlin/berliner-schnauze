import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Provide the env var that wikimediaApi.ts imports from astro:env/client.
// vi.mock is hoisted so this intercepts the import before the module loads.
vi.mock("astro:env/client", () => ({
  WIKIMEDIA_API_AUTH_TOKEN: "Bearer test-wikimedia-token",
  WP_API: "https://berliner-schnauze.test/api",
  WP_REST_API: "https://berliner-schnauze.test/wp-json",
  WP_AUTH_REFRESH_TOKEN: "not-a-real-token",
  SUGGEST_WORD_FORM_ID: "1111",
  TURNSTILE_SITE_KEY: "not-a-real-key",
  SENTRY_ENVIRONMENT: "development",
  SENTRY_TRACES_SAMPLE_RATE: 0.1,
  MATOMO_HOST: "matomo.example.com",
  MATOMO_SITE_ID: 1,
  WIKIMEDIA_API_AUTH_TOKEN_missing: undefined,
}));

function makeResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue("Error"),
  } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchWikimediaAPI", () => {
  it("returns parsed JSON for a valid file", async () => {
    const mockData = { title: "File:Berlin.jpg", preferred: { url: "https://example.com/berlin.jpg" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, mockData)));
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    expect(await fetchWikimediaAPI("File:Berlin.jpg")).toEqual(mockData);
  });

  it("logs and swallows errors on a non-ok response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("Not Found"),
    }));
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    expect(await fetchWikimediaAPI("File:NotFound.jpg")).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("logs and swallows network errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    expect(await fetchWikimediaAPI("File:Test.jpg")).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("sends GET request to the wikimedia commons API with the encoded file name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    await fetchWikimediaAPI("File:Berlin.jpg");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.wikimedia.org/core/v1/commons/file/File:Berlin.jpg");
    expect(init.method).toBe("GET");
  });

  it("includes Authorization header when token is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    await fetchWikimediaAPI("File:Test.jpg");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-wikimedia-token");
  });

  it("includes required Accept and User-Agent headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    await fetchWikimediaAPI("File:Test.jpg");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/json");
    expect(headers["User-Agent"]).toBe("Berliner Schnauze");
  });
});

describe("fetchWikimediaAPI – without auth token", () => {
  it("omits Authorization header when token is empty", async () => {
    vi.doMock("astro:env/client", () => ({
      WIKIMEDIA_API_AUTH_TOKEN: "",
    }));
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchWikimediaAPI } = await import("@services/wikimediaApi.ts");
    await fetchWikimediaAPI("File:Test.jpg");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });
});
