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

  it("openThread inserts a linked thread once and loadMore does not repeat it", async () => {
    fetchMock
      .mockReturnValueOnce(answer({ comment: comment(5, { replies: [comment(6, { parentId: 5 })] }) }))
      .mockReturnValueOnce(answer({ comments: [comment(1), comment(5)], hasMore: false, total: 3 }));
    const c = useComments(7);
    expect(await c.openThread(6)).toBe(true); // a reply id loads its thread
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/comments/6");
    expect(c.comments.value.map((x) => x.id)).toEqual([5]);
    await c.loadMore();
    expect(c.comments.value.map((x) => x.id)).toEqual([5, 1]);
    expect(await c.openThread(6)).toBe(true); // already shown: no request
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("openThread is false with a toast when the comment is gone", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    fetchMock.mockReturnValueOnce(answer({ error: "Kommentar nicht gefunden" }, 404));
    const c = useComments(7);
    expect(await c.openThread(5)).toBe(false);
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Den Kommentar jibt's nich mehr." }),
    );
    expect(c.comments.value).toHaveLength(0);
  });

  it("toasts the server error, a generic error and a network failure", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    const toast = vi.mocked(createToastNotify);
    toast.mockClear();
    fetchMock
      .mockReturnValueOnce(answer({ error: "Kaputt" }, 400))
      .mockReturnValueOnce(Promise.resolve({ json: () => Promise.reject(new Error("no json")), ok: false, status: 500 }))
      .mockReturnValueOnce(Promise.reject(new Error("offline")));
    const c = useComments(7);
    expect(await c.report(1, "", "tok")).toBe(false);
    expect(await c.report(1, "", "tok")).toBe(false);
    expect(await c.report(1, "", "tok")).toBe(false);
    expect(toast.mock.calls.map(([t]) => t.message)).toEqual([
      "Kaputt",
      "Dit hat leider nich geklappt.",
      "Dit hat leider nich geklappt.",
    ]);
  });

  it("report is true when the server accepts it", async () => {
    fetchMock.mockReturnValueOnce(answer({ ok: true }, 201));
    expect(await useComments(7).report(1, "Spam", "tok")).toBe(true);
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)).toEqual({
      commentId: 1,
      reason: "Spam",
      turnstileToken: "tok",
    });
  });

  it("loadMore skips while loading or without more pages, and keeps the page on failure", async () => {
    let release!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => (release = r)));
    const c = useComments(7);
    const first = c.loadMore();
    await c.loadMore(); // already loading
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release({ json: async () => ({ error: "x" }), ok: false, status: 500 });
    await first;
    expect(c.loaded.value).toBe(false);
    fetchMock.mockReturnValueOnce(answer({ comments: [], hasMore: false, total: 0 }));
    await c.loadMore();
    expect(fetchMock.mock.calls[1]![0]).toContain("page=1"); // the failed page is asked again
    await c.loadMore(); // no more pages
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("openThread does not add a thread twice when only the reply was missing", async () => {
    fetchMock.mockReturnValueOnce(answer({ comment: comment(5, { replies: [comment(6, { parentId: 5 })] }) }));
    const c = useComments(7);
    c.comments.value = [comment(5)];
    expect(await c.openThread(6)).toBe(true);
    expect(c.comments.value.map((x) => x.id)).toEqual([5]);
  });

  it("post: a reply joins its parent; an unknown parent adds nothing; a failure is an error", async () => {
    const ok = (id: number) => answer({ comment: comment(id, { parentId: 1 }), editKey: "k".repeat(43), pending: false }, 201);
    fetchMock.mockReturnValueOnce(ok(8)).mockReturnValueOnce(ok(9)).mockReturnValueOnce(answer({ error: "x" }, 400));
    const c = useComments(7);
    c.comments.value = [comment(1)];
    expect(await c.post({ authorName: "", parentId: 1, text: "Hallo" }, "tok")).toBe("ok");
    expect(c.comments.value[0]!.replies.map((x) => x.id)).toEqual([8]);
    expect(await c.post({ authorName: "", parentId: 99, text: "Hallo" }, "tok")).toBe("ok");
    expect(c.comments.value.map((x) => x.id)).toEqual([1]);
    expect(c.total.value).toBe(2);
    expect(await c.post({ authorName: "", text: "Hallo" }, "tok")).toBe("error");
  });

  it("edit updates the comment, keeps replies, or marks it for review", async () => {
    const reply = comment(2, { parentId: 1 });
    fetchMock
      .mockReturnValueOnce(answer({ comment: comment(1, { edited: true, text: "Neu" }), pending: false }))
      .mockReturnValueOnce(answer({ pending: true }));
    const c = useComments(7);
    c.comments.value = [comment(1, { replies: [reply] })];
    expect(await c.edit(1, "Neu")).toBe("ok");
    expect(c.comments.value[0]).toMatchObject({ edited: true, replies: [reply], text: "Neu" });
    expect(await c.edit(1, "www.x.de")).toBe("pending");
    expect(c.comments.value[0]).toMatchObject({ state: "reviewing", text: null });
  });

  it("edit: error on failure, ok when the comment is no longer listed", async () => {
    fetchMock.mockReturnValueOnce(answer({ error: "x" }, 403)).mockReturnValueOnce(answer({ pending: false }));
    const c = useComments(7);
    expect(await c.edit(1, "Neu")).toBe("error");
    expect(await c.edit(1, "Neu")).toBe("ok");
  });

  it("remove turns the comment into a placeholder and lowers the count", async () => {
    fetchMock
      .mockReturnValueOnce(answer({ deleted: true }))
      .mockReturnValueOnce(answer({ deleted: true }))
      .mockReturnValueOnce(answer({ error: "x" }, 403));
    const c = useComments(7);
    c.comments.value = [comment(1)];
    c.total.value = 1;
    expect(await c.remove(1)).toBe(true);
    expect(c.comments.value[0]).toMatchObject({ state: "removed", text: null });
    expect(await c.remove(99)).toBe(true); // not listed: count never drops below 0
    expect(c.total.value).toBe(0);
    expect(await c.remove(1)).toBe(false);
  });

  it("vote ignores a second click while busy and reports a failure", async () => {
    let release!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => (release = r))).mockReturnValueOnce(answer({ error: "x" }, 500));
    const c = useComments(7);
    c.comments.value = [comment(1)];
    const first = c.vote(1, 1);
    expect(await c.vote(1, 1)).toBe(false);
    release({ json: async () => ({ downvotes: 0, myVote: 1, upvotes: 1 }), ok: true, status: 200 });
    expect(await first).toBe(true);
    expect(c.busy.value.has(1)).toBe(false);
    expect(await c.vote(1, -1)).toBe(false);
    expect(c.comments.value[0]!.upvotes).toBe(1);
  });
});
