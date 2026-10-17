import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, verifyTurnstile } = vi.hoisted(() => ({
  create: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ create }) }));

import type { APIContext } from "astro";

import { POST } from "@/pages/api/suggest-word.ts";

const valid = {
  berlinerWord: "Kiez",
  example: "",
  translation: "Viertel",
  turnstileToken: "tok",
  userMail: "gast@example.com",
  userName: "",
};
const post = (body: unknown, raw = false) =>
  POST({
    clientAddress: "1.2.3.4",
    request: new Request("https://berliner-schnauze.wtf/api/suggest-word", {
      body: raw ? (body as string) : JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);

beforeEach(() => {
  verifyTurnstile.mockReset().mockResolvedValue(true);
  create.mockReset().mockResolvedValue({ id: 1 });
});

describe("POST /api/suggest-word", () => {
  it("stores a valid suggestion with a valid token", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(verifyTurnstile).toHaveBeenCalledWith("tok", "1.2.3.4");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].collection).toBe("suggestions");
    expect(create.mock.calls[0][0].data).toMatchObject({
      berlinerWord: "Kiez",
      userMail: "gast@example.com",
    });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("turnstileToken");
  });

  it.each([
    ["a missing token", { ...valid, turnstileToken: undefined }],
    ["an empty token", { ...valid, turnstileToken: "" }],
    ["a token that is not a string", { ...valid, turnstileToken: 1 }],
  ])("answers 403 and stores nothing for %s", async (_name, body) => {
    verifyTurnstile.mockResolvedValue(false);
    const res = await post(body);
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 403 when Cloudflare rejects the token, and also when Cloudflare cannot be reached", async () => {
    verifyTurnstile.mockResolvedValue(false);
    expect((await post(valid)).status).toBe(403);
    verifyTurnstile.mockRejectedValue(new Error("offline"));
    expect((await post(valid)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 400 for an invalid suggestion without asking Cloudflare or storing", async () => {
    const res = await post({ ...valid, translation: "" });
    expect(res.status).toBe(400);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an email that tries to inject a header before it is stored", async () => {
    const res = await post({ ...valid, userMail: "a@b.de\r\nBcc: x@evil.example" });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([["not json"], [""]])("answers 400 for a body that is not json (%j)", async (body) => {
    expect((await post(body, true)).status).toBe(400);
  });

  it("answers 502 when the suggestion cannot be stored", async () => {
    create.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it("never caches a response", async () => {
    expect((await post(valid)).headers.get("Cache-Control")).toBe("no-store");
    expect((await post({ ...valid, translation: "" })).headers.get("Cache-Control")).toBe(
      "no-store",
    );
  });
});
