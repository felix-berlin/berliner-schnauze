import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, count } = vi.hoisted(() => ({ count: vi.fn(), find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ count, find }) }));

import { listComments } from "@services/payload/comments.ts";

const c = (id: number, extra: Record<string, unknown> = {}) => ({
  authorName: "Det",
  createdAt: "2026-01-01T00:00:00.000Z",
  downvotes: 0,
  id,
  parent: null,
  removalReason: null,
  status: "published",
  text: `text ${id}`,
  upvotes: 0,
  ...extra,
});

/** top: top-level page, replies: replies of those, votes: the visitor's votes */
const setup = (top: unknown[], replies: unknown[] = [], votes: unknown[] = [], hasNextPage = false) => {
  count.mockResolvedValue({ totalDocs: 7 });
  find.mockImplementation(async ({ collection, where }) => {
    if (collection === "comment-votes") return { docs: votes };
    if (where?.parent?.in) return { docs: replies };
    return { docs: top, hasNextPage };
  });
};

beforeEach(() => {
  find.mockReset();
  count.mockReset();
});

describe("listComments", () => {
  it("drops a removed top-level comment without visible replies", async () => {
    setup([c(1, { status: "removed" }), c(2)]);
    const r = await listComments(5, "best", 1);
    expect(r.comments.map((x) => x.id)).toEqual([2]);
    expect(r.total).toBe(7);
  });

  it('keeps it as "removed" with a visible reply, removalReason passed through', async () => {
    setup([c(1, { removalReason: "Spam", status: "removed" })], [c(2, { parent: 1 })]);
    const [top] = (await listComments(5, "best", 1)).comments;
    expect(top).toMatchObject({ removalReason: "Spam", state: "removed", text: null });
    expect(top.replies.map((x) => x.id)).toEqual([2]);
  });

  it('maps hidden to "reviewing" with text null', async () => {
    setup([c(1, { status: "hidden" })], [c(2, { parent: 1 })]);
    const [top] = (await listComments(5, "best", 1)).comments;
    expect(top).toMatchObject({ state: "reviewing", text: null });
  });

  it("hasMore true when Payload reports hasNextPage even if the page shrank", async () => {
    setup([c(1, { status: "deleted" })], [], [], true);
    const r = await listComments(5, "new", 1);
    expect(r.comments).toEqual([]);
    expect(r.hasMore).toBe(true);
  });

  it("myVote from the visitor's votes", async () => {
    setup([c(1), c(2)], [c(3, { parent: 1 })], [
      { comment: 1, value: 1 },
      { comment: 3, value: -1 },
    ]);
    const r = await listComments(5, "best", 1, "v-1");
    expect(r.comments.map((x) => x.myVote)).toEqual([1, 0]);
    expect(r.comments[0].replies[0].myVote).toBe(-1);
  });

  it('empty name becomes "Anonymer Berliner"', async () => {
    setup([c(1, { authorName: "" }), c(2, { authorName: null })]);
    const r = await listComments(5, "best", 1);
    expect(r.comments.map((x) => x.authorName)).toEqual(["Anonymer Berliner", "Anonymer Berliner"]);
  });

  it("sorts best by score then date, new by date", async () => {
    setup([]);
    await listComments(5, "best", 2);
    expect(find.mock.calls[0][0]).toMatchObject({ limit: 20, page: 2, sort: ["-score", "-createdAt"] });
    find.mockClear();
    await listComments(5, "new", 1);
    expect(find.mock.calls[0][0].sort).toEqual(["-createdAt"]);
  });

  it("placeholders never show the stored name", async () => {
    setup([c(1, { authorName: "Geheim", status: "removed" })], [c(2, { parent: 1 })]);
    const [top] = (await listComments(5, "best", 1)).comments;
    expect(top.authorName).toBe("Anonymer Berliner");
    expect(top.replies[0]!.authorName).toBe("Det");
  });
});
