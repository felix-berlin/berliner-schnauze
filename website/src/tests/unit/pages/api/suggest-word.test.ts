import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyTurnstile, sendSuggestionMail } = vi.hoisted(() => ({
  sendSuggestionMail: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/suggestMail.ts", () => ({ sendSuggestionMail }));

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
  sendSuggestionMail.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/suggest-word", () => {
  it("sends one mail for a valid suggestion with a valid token", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(verifyTurnstile).toHaveBeenCalledWith("tok", "1.2.3.4");
    expect(sendSuggestionMail).toHaveBeenCalledOnce();
    expect(sendSuggestionMail.mock.calls[0][0]).toMatchObject({
      berlinerWord: "Kiez",
      userMail: "gast@example.com",
    });
    expect(sendSuggestionMail.mock.calls[0][0]).not.toHaveProperty("turnstileToken");
  });

  it.each([
    ["a missing token", { ...valid, turnstileToken: undefined }],
    ["an empty token", { ...valid, turnstileToken: "" }],
    ["a token that is not a string", { ...valid, turnstileToken: 1 }],
  ])("answers 403 and sends no mail for %s", async (_name, body) => {
    verifyTurnstile.mockResolvedValue(false);
    const res = await post(body);
    expect(res.status).toBe(403);
    expect(sendSuggestionMail).not.toHaveBeenCalled();
  });

  it("answers 403 when Cloudflare rejects the token, and also when Cloudflare cannot be reached", async () => {
    verifyTurnstile.mockResolvedValue(false);
    expect((await post(valid)).status).toBe(403);
    verifyTurnstile.mockRejectedValue(new Error("offline"));
    expect((await post(valid)).status).toBe(403);
    expect(sendSuggestionMail).not.toHaveBeenCalled();
  });

  it("answers 400 for an invalid suggestion without asking Cloudflare or sending", async () => {
    const res = await post({ ...valid, translation: "" });
    expect(res.status).toBe(400);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(sendSuggestionMail).not.toHaveBeenCalled();
  });

  it("rejects an email that tries to inject a header before it reaches the mail layer", async () => {
    const res = await post({ ...valid, userMail: "a@b.de\r\nBcc: x@evil.example" });
    expect(res.status).toBe(400);
    expect(sendSuggestionMail).not.toHaveBeenCalled();
  });

  it.each([["not json"], [""]])("answers 400 for a body that is not json (%j)", async (body) => {
    expect((await post(body, true)).status).toBe(400);
  });

  it("answers 502 when the mail cannot be sent", async () => {
    sendSuggestionMail.mockRejectedValue(new Error("smtp down"));
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
