import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findByID, update } = vi.hoisted(() => ({ findByID: vi.fn(), update: vi.fn() }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ findByID, update }),
}));

import type { APIContext } from "astro";

import { createHash } from "node:crypto";

import { DELETE, PATCH } from "@/pages/api/comments/[id].ts";

const KEY = "k".repeat(43);
const hash = (k: string) => createHash("sha256").update(k).digest("hex");
const NOW = new Date("2026-01-01T00:10:00.000Z");
const stored = (extra: Record<string, unknown> = {}) => ({
  authorName: "",
  createdAt: "2026-01-01T00:08:00.000Z",
  editKeyHash: hash(KEY),
  id: 9,
  parent: null,
  status: "published",
  text: "alt",
  ...extra,
});
const call = (fn: typeof PATCH, body: unknown, id = "9") =>
  fn({
    params: { id },
    request: new Request("https://x.test/api/comments/9", {
      body: JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);
const forbidden = { error: "Dit jeht nich mehr." };

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  findByID.mockReset().mockResolvedValue(stored());
  update
    .mockReset()
    .mockImplementation(async ({ data }) => stored({ ...data, editedAt: NOW.toISOString() }));
});
afterEach(() => vi.useRealTimers());

describe("PATCH /api/comments/:id", () => {
  it("edits within 5 min", async () => {
    const res = await call(PATCH, { editKey: KEY, text: "neu jeschrieben" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ comment: { edited: true, id: 9, text: "neu jeschrieben" }, pending: false });
    expect(JSON.stringify(body)).not.toContain(hash(KEY));
    const arg = update.mock.calls[0][0];
    expect(arg.data).toEqual({ text: "neu jeschrieben" });
  });

  it("403 at 5 min + 1 s", async () => {
    findByID.mockResolvedValue(stored({ createdAt: "2026-01-01T00:04:59.000Z" }));
    const res = await call(PATCH, { editKey: KEY, text: "neu jeschrieben" });
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("still allowed at exactly 5 min", async () => {
    findByID.mockResolvedValue(stored({ createdAt: "2026-01-01T00:05:00.000Z" }));
    expect((await call(PATCH, { editKey: KEY, text: "neu jeschrieben" })).status).toBe(200);
  });

  it("403 wrong key", async () => {
    const res = await call(PATCH, { editKey: "x".repeat(43), text: "neu jeschrieben" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(forbidden);
    expect(update).not.toHaveBeenCalled();
  });

  it("403 unknown id, same body as wrong key", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
    const res = await call(PATCH, { editKey: KEY, text: "neu jeschrieben" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(forbidden);
  });

  it("403 when removed or deleted", async () => {
    for (const status of ["hidden", "removed", "deleted"]) {
      findByID.mockResolvedValue(stored({ status }));
      expect((await call(PATCH, { editKey: KEY, text: "neu jeschrieben" })).status).toBe(403);
    }
  });

  it("edit adding a link returns pending:true", async () => {
    update.mockResolvedValue(
      stored({ editedAt: NOW.toISOString(), status: "pending", text: "http://spam.de" }),
    );
    const body = await (await call(PATCH, { editKey: KEY, text: "http://spam.de" })).json();
    expect(body.pending).toBe(true);
    expect(body).not.toHaveProperty("comment");
    expect(update.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("400 for invalid input", async () => {
    expect((await call(PATCH, { editKey: KEY, text: "" })).status).toBe(400);
    expect((await call(PATCH, { editKey: KEY, text: "neu jeschrieben" }, "abc")).status).toBe(400);
  });

  it("502 when the database fails", async () => {
    findByID.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call(PATCH, { editKey: KEY, text: "neu jeschrieben" })).status).toBe(502);
  });
});

describe("DELETE /api/comments/:id", () => {
  it("sets status deleted", async () => {
    const res = await call(DELETE, { editKey: KEY });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(update.mock.calls[0][0]).toMatchObject({ data: { authorName: null, status: "deleted", text: "[gelöscht]" }, id: 9 });
  });

  it("403 wrong key or after the window", async () => {
    expect((await call(DELETE, { editKey: "x".repeat(43) })).status).toBe(403);
    findByID.mockResolvedValue(stored({ createdAt: "2026-01-01T00:04:59.000Z" }));
    expect((await call(DELETE, { editKey: KEY })).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
