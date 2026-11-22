import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, find, verifyTurnstile } = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ create, find }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

import type { APIContext } from "astro";

import { POST } from "@/pages/api/reports.ts";

const post = (body: unknown) =>
  POST({
    clientAddress: "1.2.3.4",
    request: new Request("https://berliner-schnauze.wtf/api/reports", {
      body: JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);
const valid = { kind: "spelling", text: "Da fehlt ein k.", turnstileToken: "tok", word: "icke" };

beforeEach(() => {
  verifyTurnstile.mockReset().mockResolvedValue("pass");
  create.mockReset().mockResolvedValue({ email: "secret@example.com", id: 1 });
  find.mockReset().mockResolvedValue({ docs: [{ id: 5 }] });
});

describe("POST /api/reports", () => {
  it("creates one open report and answers 201 { ok } without the row or the e-mail", async () => {
    const res = await post({ ...valid, email: "secret@example.com" });
    expect(res.status).toBe(201);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: true });
    expect(text).not.toContain("secret@example.com");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({
      collection: "reports",
      data: { email: "secret@example.com", kind: "spelling", status: "open", text: "Da fehlt ein k.", word: 5 },
    });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("turnstileToken");
  });

  it("takes an empty e-mail as none", async () => {
    expect((await post({ ...valid, email: "" })).status).toBe(201);
    expect(create.mock.calls[0][0].data).not.toHaveProperty("email");
  });

  it.each([
    ["no kind", { ...valid, kind: undefined }, "kind"],
    ["unknown kind", { ...valid, kind: "nope" }, "kind"],
    ["no text", { ...valid, text: " " }, "text"],
    ["text over 1000", { ...valid, text: "a".repeat(1001) }, "text"],
    ["invalid e-mail", { ...valid, email: "kein-mail" }, "email"],
    ["e-mail over 200", { ...valid, email: `${"a".repeat(200)}@example.com` }, "email"],
    ["no word", { ...valid, word: undefined }, "word"],
  ])("400 with the field for %s", async (_, body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field });
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts all seven kinds", async () => {
    for (const kind of ["meaning", "spelling", "example", "audio", "fact", "inappropriate", "other"])
      expect((await post({ ...valid, kind })).status).toBe(201);
  });

  it("403 when the captcha fails", async () => {
    verifyTurnstile.mockResolvedValue("fail");
    expect((await post(valid)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("404 for an unknown word", async () => {
    find.mockResolvedValue({ docs: [] });
    expect((await post(valid)).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("502 without leaking the error when storing fails", async () => {
    create.mockRejectedValue(new Error("db password leaked"));
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
  });
});
