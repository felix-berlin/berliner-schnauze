import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ TURNSTILE_SECRET_KEY: "secret" as string | undefined }));
vi.mock("astro:env/server", () => env);

import { verifyTurnstile } from "@services/turnstile.ts";

const fetchMock = vi.spyOn(globalThis, "fetch");
const answer = (body: unknown, ok = true) =>
  fetchMock.mockResolvedValue({ json: async () => body, ok } as Response);

beforeEach(() => {
  fetchMock.mockReset();
  env.TURNSTILE_SECRET_KEY = "secret";
});

describe("verifyTurnstile", () => {
  it("asks Cloudflare with the secret, the token and the client ip", async () => {
    answer({ success: true });
    expect(await verifyTurnstile("tok", "1.2.3.4")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(
      Object.fromEntries(new URLSearchParams((init as { body: URLSearchParams }).body.toString())),
    ).toEqual({
      remoteip: "1.2.3.4",
      response: "tok",
      secret: "secret",
    });
  });

  it("omits the ip when unknown", async () => {
    answer({ success: true });
    await verifyTurnstile("tok");
    expect((fetchMock.mock.calls[0][1] as { body: URLSearchParams }).body.toString()).not.toContain(
      "remoteip",
    );
  });

  it("is false when Cloudflare says so", async () => {
    answer({ success: false });
    expect(await verifyTurnstile("tok")).toBe(false);
  });

  it("is false when the answer is not a plain success", async () => {
    answer({ success: "true" });
    expect(await verifyTurnstile("tok")).toBe(false);
  });

  it("fails closed on a network error, a bad status and unparsable answers", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await verifyTurnstile("tok")).toBe(false);
    answer({ success: true }, false);
    expect(await verifyTurnstile("tok")).toBe(false);
    fetchMock.mockResolvedValue({
      json: async () => Promise.reject(new Error("not json")),
      ok: true,
    } as unknown as Response);
    expect(await verifyTurnstile("tok")).toBe(false);
  });

  it("is false without a token and without a configured secret, and then never calls Cloudflare", async () => {
    expect(await verifyTurnstile("")).toBe(false);
    env.TURNSTILE_SECRET_KEY = undefined;
    expect(await verifyTurnstile("tok")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
