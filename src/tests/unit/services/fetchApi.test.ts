// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAPI", () => {
  it("returns parsed JSON on a successful response", async () => {
    const data = { data: { words: [{ id: 1 }] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, data)));
    const { fetchAPI } = await import("@services/fetchApi.ts");
    expect(await fetchAPI("{ words { id } }")).toEqual(data);
  });

  it("logs and swallows errors on a non-ok response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    }));
    const { fetchAPI } = await import("@services/fetchApi.ts");
    expect(await fetchAPI("{ words { id } }")).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("logs and swallows network errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const { fetchAPI } = await import("@services/fetchApi.ts");
    expect(await fetchAPI("{ words { id } }")).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("sends a POST request with JSON body containing query and variables", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchAPI } = await import("@services/fetchApi.ts");

    const vars = { id: 42 };
    await fetchAPI("{ word { id } }", { variables: vars });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("{ word { id } }");
    expect(body.variables).toEqual(vars);
  });

  it("sends JSON content-type and accept headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchAPI } = await import("@services/fetchApi.ts");
    await fetchAPI("{ words { id } }");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Accept"]).toBe("application/json");
  });

  it("defaults variables to empty object when omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchAPI } = await import("@services/fetchApi.ts");
    await fetchAPI("{ words { id } }");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.variables).toEqual({});
  });
});
