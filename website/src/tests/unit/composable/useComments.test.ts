import type { PublicComment } from "@utils/commentSchema.ts";

import { useComments } from "@composables/useComments.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);

const comment = (id: number, extra: Partial<PublicComment> = {}): PublicComment => ({
  authorName: "Anonymer Berliner",
  createdAt: new Date().toISOString(),
  downvotes: 0,
  edited: false,
  id,
  myVote: 0,
  parentId: null,
  removalReason: null,
  replies: [],
  state: "visible",
  text: `Text ${id}`,
  upvotes: 0,
  ...extra,
});

const answer = (body: unknown, status = 200) =>
  Promise.resolve({ json: async () => body, ok: status < 300, status });

describe("useComments", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("loadMore appends page 2", async () => {
    fetchMock
      .mockReturnValueOnce(answer({ comments: [comment(1)], hasMore: true, total: 2 }))
      .mockReturnValueOnce(answer({ comments: [comment(2)], hasMore: false, total: 2 }));
    const c = useComments(7);
    await c.loadMore();
    await c.loadMore();
    expect(c.comments.value.map((x) => x.id)).toEqual([1, 2]);
    expect(fetchMock.mock.calls[1]![0]).toContain("page=2");
    expect(c.hasMore.value).toBe(false);
  });

  it("sort change reloads from page 1", async () => {
    fetchMock.mockImplementation(() => answer({ comments: [comment(1)], hasMore: true, total: 1 }));
    const c = useComments(7);
    await c.loadMore();
    c.sort.value = "new";
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const url = fetchMock.mock.calls[1]![0] as string;
    expect(url).toContain("sort=new");
    expect(url).toContain("page=1");
    await vi.waitFor(() => expect(c.loading.value).toBe(false));
    expect(c.comments.value).toHaveLength(1);
  });

  it("post stores the edit key and prepends the comment", async () => {
    fetchMock.mockReturnValueOnce(
      answer({ comment: comment(9), editKey: "k".repeat(43), pending: false }, 201),
    );
    const c = useComments(7);
    c.comments.value = [comment(1)];
    expect(await c.post({ authorName: "", text: "Hallo" }, "tok")).toBe("ok");
    expect(c.comments.value.map((x) => x.id)).toEqual([9, 1]);
    expect(c.canEdit(9)).toBe(true);
    expect(JSON.parse(localStorage.getItem("bs-comment-keys")!)["9"].key).toBe("k".repeat(43));
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)).toMatchObject({
      turnstileToken: "tok",
      wordId: 7,
    });
  });

  it("pending post does not prepend", async () => {
    fetchMock.mockReturnValueOnce(answer({ editKey: "k".repeat(43), pending: true }, 201));
    const c = useComments(7);
    expect(await c.post({ authorName: "", text: "www.x.de" }, "tok")).toBe("pending");
    expect(c.comments.value).toHaveLength(0);
  });

  it("vote updates counts and myVote from the response", async () => {
    fetchMock.mockReturnValueOnce(answer({ downvotes: 1, myVote: 1, upvotes: 4 }));
    const c = useComments(7);
    c.comments.value = [comment(1, { replies: [comment(2, { parentId: 1 })] })];
    await c.vote(2, 1);
    expect(c.comments.value[0]!.replies[0]).toMatchObject({ downvotes: 1, myVote: 1, upvotes: 4 });
  });

  it("canEdit false after 5 min", async () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValueOnce(
      answer({ comment: comment(9), editKey: "k".repeat(43), pending: false }, 201),
    );
    const c = useComments(7);
    await c.post({ authorName: "", text: "Hallo" }, "tok");
    expect(c.canEdit(9)).toBe(true);
    vi.advanceTimersByTime(5 * 60_000 + 1000);
    expect(c.canEdit(9)).toBe(false);
    expect(c.isOwn(9)).toBe(true); // still mine after the edit window
    expect(c.isOwn(1)).toBe(false);
  });

  it("answers 429 with a warning toast and reports the error", async () => {
    fetchMock.mockReturnValueOnce(answer("Too many", 429));
    const c = useComments(7);
    expect(await c.post({ authorName: "", text: "Hallo" }, "tok")).toBe("error");
  });

  it("does not duplicate an own post when the next page repeats it", async () => {
    fetchMock
      .mockReturnValueOnce(
        answer({ comment: comment(9), editKey: "k".repeat(43), pending: false }, 201),
      )
      .mockReturnValueOnce(
        answer({ comments: [comment(9), comment(2)], hasMore: false, total: 2 }),
      );
    const c = useComments(7);
    await c.post({ authorName: "", text: "Hallo" }, "tok");
    await c.loadMore();
    expect(c.comments.value.map((x) => x.id)).toEqual([9, 2]);
  });

  it("does not append a stale page after a sort change", async () => {
    let release!: (v: unknown) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((r) => (release = r)))
      .mockReturnValueOnce(answer({ comments: [comment(5)], hasMore: false, total: 1 }));
    const c = useComments(7);
    const first = c.loadMore();
    c.sort.value = "new";
    await vi.waitFor(() => expect(c.comments.value.map((x) => x.id)).toEqual([5]));
    release({
      json: async () => ({ comments: [comment(1)], hasMore: true, total: 1 }),
      ok: true,
      status: 200,
    });
    await first;
    expect(c.comments.value.map((x) => x.id)).toEqual([5]);
  });

  it("prunes expired edit keys on load", async () => {
    localStorage.setItem(
      "bs-comment-keys",
      JSON.stringify({
        1: { createdAt: Date.now() - 10 * 60_000, key: "old" },
        2: { createdAt: Date.now(), key: "new" },
      }),
    );
    const c = useComments(7);
    expect(c.canEdit(1)).toBe(false);
    await nextTick();
    expect(Object.keys(JSON.parse(localStorage.getItem("bs-comment-keys")!))).toEqual(["2"]);
  });
});
