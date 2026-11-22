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

import { POST } from "@/pages/api/contribute.ts";

const post = (body: unknown) =>
  POST({
    clientAddress: "1.2.3.4",
    request: new Request("https://berliner-schnauze.wtf/api/contribute", {
      body: JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);
const example = { text: "Ick bin da.", turnstileToken: "tok", type: "example", word: "icke" };
const fact = {
  kind: "herkunft",
  text: "Kommt aus dem Jiddischen.",
  turnstileToken: "tok",
  type: "fact",
  word: "icke",
};
const related = {
  relatedText: "Molle",
  relation: "gleich",
  turnstileToken: "tok",
  type: "related",
  word: "icke",
};

beforeEach(() => {
  verifyTurnstile.mockReset().mockResolvedValue("pass");
  create.mockReset().mockResolvedValue({ id: 1, status: "new", userMail: "x@example.com" });
  find.mockReset().mockResolvedValue({ docs: [{ id: 5 }] });
});

describe("POST /api/contribute", () => {
  it("creates exactly one suggestion for an example and answers 201 { ok }", async () => {
    const res = await post({ ...example, highdeutsch: "Ich bin da.", name: "Icke" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(create).toHaveBeenCalledOnce();
    const args = create.mock.calls[0][0];
    expect(args.collection).toBe("suggestions");
    expect(args.data).toEqual({
      highdeutsch: "Ich bin da.",
      targetWord: 5,
      text: "Ick bin da.",
      type: "example",
      userName: "Icke",
    });
  });

  it("cleans the name: invisible characters dropped, whitespace and newlines collapsed", async () => {
    await post({ ...example, name: "  Ick\u200Be\r\nXY\n\n  Z " });
    expect(create.mock.calls[0][0].data.userName).toBe("Icke XY Z");
  });

  it("creates a fact and a related word on the target word, leaving `word` empty", async () => {
    expect((await post(fact)).status).toBe(201);
    expect(create.mock.calls[0][0].data).toMatchObject({
      kind: "herkunft",
      targetWord: 5,
      type: "fact",
    });
    expect((await post(related)).status).toBe(201);
    const data = create.mock.calls[1][0].data;
    expect(data).toMatchObject({
      relatedText: "Molle",
      relation: "gleich",
      targetWord: 5,
      type: "related",
    });
    expect(data).not.toHaveProperty("word");
    expect(data).not.toHaveProperty("turnstileToken");
  });

  it.each([
    ["example over 200", { ...example, text: "a".repeat(201) }, "text"],
    ["highdeutsch over 200", { ...example, highdeutsch: "a".repeat(201) }, "highdeutsch"],
    ["fact over 1000", { ...fact, text: "a".repeat(1001) }, "text"],
    ["fact without kind", { ...fact, kind: undefined }, "kind"],
    ["fact with unknown kind", { ...fact, kind: "nope" }, "kind"],
    ["fact without text", { ...fact, text: " " }, "text"],
    ["related without relatedText", { ...related, relatedText: undefined }, "relatedText"],
    ["related over 60", { ...related, relatedText: "a".repeat(61) }, "relatedText"],
    ["related without relation", { ...related, relation: undefined }, "relation"],
    ["name over 40", { ...example, name: "n".repeat(41) }, "name"],
    ["unknown type", { ...example, type: "word" }, "type"],
    ["no word", { ...example, word: undefined }, "word"],
  ])("400 with the field for %s", async (_, body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field, message: expect.any(String) });
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts exactly 200 and 1000 characters", async () => {
    expect((await post({ ...example, text: "a".repeat(200) })).status).toBe(201);
    expect((await post({ ...fact, text: "a".repeat(1000) })).status).toBe(201);
  });

  it("403 when the captcha fails, before anything is looked up or stored", async () => {
    verifyTurnstile.mockResolvedValue("fail");
    expect((await post(example)).status).toBe(403);
    expect(find).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("404 for an unknown, draft or trashed word", async () => {
    find.mockResolvedValue({ docs: [] });
    expect((await post(example)).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("502 without leaking the error when storing fails", async () => {
    create.mockRejectedValue(new Error("db password leaked"));
    const res = await post(example);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
  });
});
