import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, deleteByID, find, findByID, update } = vi.hoisted(() => ({
  create: vi.fn(),
  deleteByID: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ create, delete: deleteByID, find, findByID, update }),
}));

import type { APIContext } from "astro";

import { POST } from "@/pages/api/comment-votes.ts";

const set = vi.fn();
const post = (body: unknown, cookie?: string) =>
  POST({
    cookies: { get: () => (cookie ? { value: cookie } : undefined), set },
    request: new Request("https://berliner-schnauze.wtf/api/comment-votes", {
      body: JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);
const comment = (extra: Record<string, unknown> = {}) => ({
  downvotes: 0,
  id: 7,
  status: "published",
  upvotes: 1,
  ...extra,
});
const uniqueViolation = Object.assign(new Error("The following field is invalid"), {
  data: { errors: [{ message: "Value must be unique", path: "comment_id, visitor" }] },
  name: "ValidationError",
  status: 400,
});

beforeEach(() => {
  set.mockReset();
  create.mockReset().mockResolvedValue({ id: 1 });
  update.mockReset().mockResolvedValue({ id: 1 });
  deleteByID.mockReset().mockResolvedValue({ docs: [] });
  find.mockReset().mockResolvedValue({ docs: [] });
  findByID.mockReset().mockResolvedValue(comment());
});

describe("POST /api/comment-votes", () => {
  it("sets cookie on first vote", async () => {
    const res = await post({ commentId: 7, value: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ downvotes: 0, myVote: 1, upvotes: 1 });
    expect(set).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].data).toMatchObject({ comment: 7, value: 1 });
  });

  it("switch +1 -> -1 updates the one row", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, value: 1 }] });
    findByID.mockResolvedValue(comment({ downvotes: 1, upvotes: 0 }));
    const res = await post({ commentId: 7, value: -1 }, "v-1");
    expect(await res.json()).toEqual({ downvotes: 1, myVote: -1, upvotes: 0 });
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).toMatchObject({ data: { value: -1 }, id: 3 });
    expect(create).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("0 removes the vote", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, value: 1 }] });
    findByID.mockResolvedValue(comment({ upvotes: 0 }));
    const res = await post({ commentId: 7, value: 0 }, "v-1");
    expect(await res.json()).toEqual({ downvotes: 0, myVote: 0, upvotes: 0 });
    expect(deleteByID.mock.calls[0][0]).toMatchObject({ collection: "comment-votes", id: 3 });
  });

  it("0 without an existing vote deletes nothing", async () => {
    const res = await post({ commentId: 7, value: 0 }, "v-1");
    expect(res.status).toBe(200);
    expect(deleteByID).not.toHaveBeenCalled();
  });

  it("unchanged value skips the update", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, value: 1 }] });
    await post({ commentId: 7, value: 1 }, "v-1");
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("a unique-violation race re-reads and updates", async () => {
    find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [{ id: 4, value: 1 }] });
    create.mockRejectedValue(uniqueViolation);
    const res = await post({ commentId: 7, value: -1 }, "v-1");
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0]).toMatchObject({ data: { value: -1 }, id: 4 });
  });

  it.each(["pending", "hidden", "removed", "deleted"])("404 on %s comment", async (status) => {
    findByID.mockResolvedValue(comment({ status }));
    expect((await post({ commentId: 7, value: 1 }, "v-1")).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("404 on unknown comment, 502 on other errors, 400 on bad input", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("nf"), { status: 404 }));
    expect((await post({ commentId: 7, value: 1 })).status).toBe(404);
    findByID.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ commentId: 7, value: 1 })).status).toBe(502);
    expect((await post({ commentId: 7, value: 5 })).status).toBe(400);
  });
  it("caps vote changes per IP and comment, even with a fresh cookie each time", async () => {
    const vote = () =>
      POST({
        clientAddress: "10.0.0.1",
        cookies: { get: () => undefined, set },
        request: new Request("https://berliner-schnauze.wtf/api/comment-votes", {
          body: JSON.stringify({ commentId: 99, value: 1 }),
          method: "POST",
        }),
      } as unknown as APIContext);
    for (let i = 0; i < 20; i++) expect((await vote()).status).toBe(200);
    expect((await vote()).status).toBe(429);
  });
});
