import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, findByID, verifyTurnstile } = vi.hoisted(() => ({
  create: vi.fn(),
  findByID: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ create, findByID }),
}));

import type { APIContext } from "astro";

import { POST } from "@/pages/api/comment-reports.ts";

let n = 0;
/** Each test gets its own commentId, so the in-memory per-IP dedup never leaks between tests. */
const post = (body: Record<string, unknown>, ip = "9.9.9.9") =>
  POST({
    clientAddress: ip,
    cookies: { get: () => ({ value: "v-1" }), set: vi.fn() },
    request: new Request("https://berliner-schnauze.wtf/api/comment-reports", {
      body: JSON.stringify({ reason: "Spam", turnstileToken: "tok", ...body }),
      method: "POST",
    }),
  } as unknown as APIContext);
const uniqueViolation = Object.assign(new Error("invalid"), {
  name: "ValidationError",
  status: 400,
});
let id: number;

beforeEach(() => {
  id = 100 + ++n;
  verifyTurnstile.mockReset().mockResolvedValue("pass");
  create.mockReset().mockResolvedValue({ id: 1 });
  findByID.mockReset().mockResolvedValue({ id, status: "published" });
});

describe("POST /api/comment-reports", () => {
  it("creates once", async () => {
    const res = await post({ commentId: id });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reported: true });
    expect(create.mock.calls[0][0]).toMatchObject({
      collection: "comment-reports",
      data: { comment: id, reason: "Spam", visitor: "v-1" },
    });
  });

  it("second report from same IP within 24 h answers 200 but does not create", async () => {
    await post({ commentId: id });
    const res = await post({ commentId: id });
    expect(await res.json()).toEqual({ reported: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("same visitor twice answers 200 without throwing", async () => {
    create.mockRejectedValue(uniqueViolation);
    const res = await post({ commentId: id });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reported: true });
  });

  it("403 failed captcha, 503 unavailable", async () => {
    verifyTurnstile.mockResolvedValue("fail");
    expect((await post({ commentId: id })).status).toBe(403);
    verifyTurnstile.mockResolvedValue("unavailable");
    expect((await post({ commentId: id })).status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("404 on non-published", async () => {
    findByID.mockResolvedValue({ id, status: "hidden" });
    expect((await post({ commentId: id })).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("502 on other errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("db down"));
    expect((await post({ commentId: id })).status).toBe(502);
  });
});
