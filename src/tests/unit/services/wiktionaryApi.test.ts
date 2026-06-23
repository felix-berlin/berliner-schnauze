import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function makeWiktionaryBody(genus: string | null): unknown {
  const content = genus ? `{{Deutsch Substantiv Übersicht\n|Genus=${genus}\n}}` : "{{Deutsch Verb}}";
  return {
    query: {
      pages: {
        "12345": {
          revisions: [{ "*": content }],
        },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchGermanArtikel", () => {
  it("returns 'der' for masculine nouns (Genus=m)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, makeWiktionaryBody("m"))));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Hund")).toBe("der");
  });

  it("returns 'die' for feminine nouns (Genus=f)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, makeWiktionaryBody("f"))));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Katze")).toBe("die");
  });

  it("returns 'das' for neuter nouns (Genus=n)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, makeWiktionaryBody("n"))));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Kind")).toBe("das");
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(false, {})));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Unbekannt")).toBeNull();
  });

  it("returns null when page has no revisions", async () => {
    const body = { query: { pages: { "-1": {} } } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, body)));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Unbekannt")).toBeNull();
  });

  it("returns null when content has no Genus match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, makeWiktionaryBody(null))));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("laufen")).toBeNull();
  });

  it("returns null and logs error on network failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Hund")).toBeNull();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("returns null silently on AbortError (timeout)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortErr));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Hund")).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("returns null when query.pages is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, { query: {} })));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Hund")).toBeNull();
  });

  it("returns null on JSON parse failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    }));
    const { fetchGermanArtikel } = await import("@services/wiktionaryApi.ts");
    expect(await fetchGermanArtikel("Hund")).toBeNull();
    expect(consoleSpy).toHaveBeenCalledOnce();
  });
});
