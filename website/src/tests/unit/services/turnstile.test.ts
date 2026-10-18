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
    expect(await verifyTurnstile("tok", "1.2.3.4")).toBe("pass");
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

  it("fails when Cloudflare says so", async () => {
    answer({ success: false });
    expect(await verifyTurnstile("tok")).toBe("fail");
  });

  it("fails when the answer is not a plain success", async () => {
    answer({ success: "true" });
    expect(await verifyTurnstile("tok")).toBe("fail");
  });

  it("is unavailable, and logs why, on a network error, a bad status and unparsable answers", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await verifyTurnstile("tok")).toBe("unavailable");
    answer({ success: true }, false);
    expect(await verifyTurnstile("tok")).toBe("unavailable");
    fetchMock.mockResolvedValue({
      json: async () => Promise.reject(new Error("not json")),
      ok: true,
    } as unknown as Response);
    expect(await verifyTurnstile("tok")).toBe("unavailable");
    expect(log).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });

  it("fails without a token, is unavailable without a secret, and then never calls Cloudflare", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyTurnstile("")).toBe("fail");
    env.TURNSTILE_SECRET_KEY = undefined;
    expect(await verifyTurnstile("tok")).toBe("unavailable");
    expect(log).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
