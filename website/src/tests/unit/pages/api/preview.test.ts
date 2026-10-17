import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchDraftPost, fetchDraftWord } = vi.hoisted(() => ({
  fetchDraftPost: vi.fn(),
  fetchDraftWord: vi.fn(),
}));
vi.mock("@services/payload/words.ts", () => ({ fetchDraftWord }));
vi.mock("@services/payload/posts.ts", () => ({ fetchDraftPost }));

import type { APIContext } from "astro";

import { previewToken } from "payload-app/preview";

import { GET } from "@/pages/api/preview.ts";

const get = (token?: string) => {
  const set = vi.fn();
  const url = new URL("https://berliner-schnauze.wtf/api/preview");
  if (token) url.searchParams.set("token", token);
  return {
    response: GET({ cookies: { set }, url } as unknown as APIContext) as Promise<Response>,
    set,
  };
};

beforeEach(() => {
  vi.stubEnv("PAYLOAD_SECRET", "geheim");
  fetchDraftWord.mockReset().mockResolvedValue({ slug: "neues-wort" });
  fetchDraftPost.mockReset().mockResolvedValue({ slug: "neuer-artikel" });
});

describe("GET /api/preview", () => {
  it("keeps a valid token in an httpOnly cookie and sends the editor to the draft's page", async () => {
    const token = previewToken("geheim", { collection: "words", id: 7 });
    const { response, set } = get(token);
    const res = await response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toMatch(/^\/wort\/neues-wort\?preview=\d+$/);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchDraftWord).toHaveBeenCalledWith(7);
    expect(set).toHaveBeenCalledWith(
      "bs_preview",
      token,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("routes posts to the magazine", async () => {
    const res = await get(previewToken("geheim", { collection: "posts", id: 3 })).response;
    expect(res.headers.get("Location")).toMatch(/^\/magazin\/neuer-artikel\?/);
  });

  it.each([
    ["no token", undefined],
    ["a token signed with another secret", previewToken("anders", { collection: "words", id: 7 })],
    [
      "an expired token",
      previewToken("geheim", { collection: "words", id: 7 }, Date.now() - 2 * 3600_000),
    ],
  ])("answers 403 without a cookie for %s", async (_name, token) => {
    const { response, set } = get(token);
    expect((await response).status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("answers 404, not 'invalid link', when the doc is gone or has no slug yet", async () => {
    fetchDraftWord.mockResolvedValue(undefined);
    const { response, set } = get(previewToken("geheim", { collection: "words", id: 7 }));
    const res = await response;
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Slug");
    expect(set).not.toHaveBeenCalled();
  });

  it("answers 503 and logs when PAYLOAD_SECRET is missing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = previewToken("geheim", { collection: "words", id: 7 });
    vi.stubEnv("PAYLOAD_SECRET", "");
    const { response, set } = get(token);
    expect((await response).status).toBe(503);
    expect(log).toHaveBeenCalledOnce();
    expect(set).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
