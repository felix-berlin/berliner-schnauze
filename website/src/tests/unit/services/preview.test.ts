import { PREVIEW_COOKIE, previewDraft } from "@services/preview.ts";
import { previewToken } from "payload-app/preview";
import { beforeEach, describe, expect, it, vi } from "vitest";

const astro = (token?: string) => ({
  cookies: {
    get: (name: string) => (name === PREVIEW_COOKIE && token ? { value: token } : undefined),
  },
  response: { headers: new Headers() },
});
const fetchDraft = vi.fn();

beforeEach(() => {
  vi.stubEnv("PAYLOAD_SECRET", "geheim");
  fetchDraft.mockReset().mockResolvedValue({ slug: "neu" });
});

describe("previewDraft", () => {
  it("returns the draft for the page its cookie is for, and marks the response private", async () => {
    const page = astro(previewToken("geheim", { collection: "words", id: 7 }));
    expect(await previewDraft(page as never, "words", "neu", fetchDraft)).toEqual({ slug: "neu" });
    expect(fetchDraft).toHaveBeenCalledWith(7);
    expect(page.response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([
    ["no cookie", undefined, "words", "neu"],
    [
      "a cookie for another page",
      previewToken("geheim", { collection: "words", id: 7 }),
      "words",
      "alt",
    ],
    [
      "a cookie for another collection",
      previewToken("geheim", { collection: "posts", id: 7 }),
      "words",
      "neu",
    ],
    [
      "a cookie signed with another secret",
      previewToken("anders", { collection: "words", id: 7 }),
      "words",
      "neu",
    ],
  ] as const)(
    "keeps the public page (and its cache header) with %s",
    async (_name, token, collection, slug) => {
      const page = astro(token);
      expect(await previewDraft(page as never, collection, slug, fetchDraft)).toBeUndefined();
      expect(page.response.headers.has("Cache-Control")).toBe(false);
    },
  );

  it("keeps the public page when the draft is gone", async () => {
    fetchDraft.mockResolvedValue(undefined);
    const page = astro(previewToken("geheim", { collection: "words", id: 7 }));
    expect(await previewDraft(page as never, "words", "neu", fetchDraft)).toBeUndefined();
    expect(page.response.headers.has("Cache-Control")).toBe(false);
  });
});
