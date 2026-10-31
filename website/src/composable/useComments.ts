import type { PublicComment } from "@utils/commentSchema.ts";
import type { InjectionKey, Ref } from "vue";

import { createToastNotify } from "@stores/toastNotify.ts";
import { reportError } from "@utils/reportError.ts";
import { useIntervalFn, useLocalStorage } from "@vueuse/core";
import { EDIT_WINDOW_MS } from "payload-app/comments";
import { ref, watch } from "vue";

type Keys = Record<number, { createdAt: number; key: string }>;
export type PostResult = "error" | "ok" | "pending";
type Input = { authorName: string; parentId?: number; text: string };

const API = "/api/comments";
const json = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

/** Runs a request; null (plus a toast) when it failed. 429 keeps the input, the caller decides what else. */
const call = async <T>(url: string, init?: RequestInit, notFound?: string): Promise<null | T> => {
  try {
    const res = await fetch(url, init);
    if (res.status === 404 && notFound) {
      createToastNotify({ message: notFound, status: "info" });
      return null;
    }
    if (res.status === 429) {
      createToastNotify({
        message: "Ma langsam, Keule – versuch's gleich nochmal.",
        status: "warning",
      });
      return null;
    }
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    // A 2xx without a JSON body is a failure too: the caller would treat `{}` as done.
    if (!res.ok || !body) {
      createToastNotify({
        message: body?.error || "Dit hat leider nich geklappt.",
        status: "error",
      });
      return null;
    }
    return body;
  } catch (error) {
    // fetch() rejects with a TypeError when offline; anything else is a bug worth reporting.
    if (!(error instanceof TypeError)) reportError(error);
    createToastNotify({ message: "Dit hat leider nich geklappt.", status: "error" });
    return null;
  }
};

const told = (pending: boolean): PostResult => {
  if (pending)
    createToastNotify({
      message: "Dein Kommentar hat 'nen Link, den kieken wir uns erst an.",
      status: "info",
    });
  return pending ? "pending" : "ok";
};

export const useComments = (wordId: number) => {
  const comments = ref<PublicComment[]>([]);
  const total = ref(0);
  const sort = ref<"best" | "new">("best");
  const hasMore = ref(true);
  const loading = ref(false);
  const loaded = ref(false);
  /** The last page failed to load; the list offers a retry instead of waiting for a scroll that never comes. */
  const failed = ref(false);
  const busy = ref(new Set<number>());
  /** The comment a link points at; its card shows the highlight. */
  const highlighted = ref<null | number>(null);
  let page = 0;
  let generation = 0;

  const keys = useLocalStorage<Keys>("bs-comment-keys", {});
  const tick = ref(0);
  const ticker = useIntervalFn(() => tick.value++, 1000, { immediate: false });
  const fresh = (k: { createdAt: number }) => Date.now() - k.createdAt < EDIT_WINDOW_MS;
  // localStorage is user-editable: anything malformed counts as no keys rather than breaking the island.
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  keys.value = Object.fromEntries(
    Object.entries(isRecord(keys.value) ? keys.value : {}).filter(
      ([, k]) =>
        isRecord(k) && typeof k.createdAt === "number" && fresh(k as { createdAt: number }),
    ),
  ) as Keys;
  // Only tick while an edit key can still expire.
  watch(
    () => Object.keys(keys.value).length > 0,
    (any) => (any ? ticker.resume() : ticker.pause()),
    { immediate: true },
  );

  const canEdit = (id: number): boolean => {
    void tick.value; // re-evaluates every second, so the buttons vanish on their own
    const k = keys.value[id];
    return Boolean(k) && fresh(k!);
  };

  // Own comment ids outlive the edit key, so „Melden“ stays hidden on them.
  const own = useLocalStorage<number[]>("bs-own-comments", []);
  if (!Array.isArray(own.value)) own.value = [];
  const isOwn = (id: number): boolean => own.value.includes(id);

  const find = (id: number): PublicComment | undefined => {
    for (const c of comments.value) {
      if (c.id === id) return c;
      const r = c.replies.find((x) => x.id === id);
      if (r) return r;
    }
  };

  const loadMore = async (): Promise<void> => {
    if (loading.value || !hasMore.value) return;
    const mine = generation;
    loading.value = true;
    const data = await call<{ comments: PublicComment[]; hasMore: boolean; total: number }>(
      `${API}?word=${wordId}&sort=${sort.value}&page=${page + 1}`,
    );
    if (mine !== generation) return; // sort changed meanwhile; that reload owns `loading`
    loading.value = false;
    failed.value = !data;
    if (!data) return;
    page += 1;
    loaded.value = true;
    // An own post shifts the offset by one, so a page can repeat a comment already shown.
    const shown = new Set(comments.value.map((c) => c.id));
    comments.value.push(...data.comments.filter((c) => !shown.has(c.id)));
    hasMore.value = data.hasMore;
    total.value = data.total;
  };

  /** Makes sure the thread of a linked comment is in the list; false (plus a toast) when it is gone. */
  const openThread = async (id: number): Promise<boolean> => {
    if (find(id)) return true;
    const data = await call<{ comment: PublicComment }>(
      `${API}/${id}`,
      undefined,
      "Den Kommentar jibt's nich mehr.",
    );
    if (!data) return false;
    // A page that lands later skips it again (loadMore dedupes by id).
    if (!comments.value.some((c) => c.id === data.comment.id)) comments.value.unshift(data.comment);
    return true;
  };

  watch(sort, () => {
    generation += 1;
    page = 0;
    comments.value = [];
    hasMore.value = true;
    loading.value = false;
    void loadMore();
  });

  const post = async (input: Input, turnstileToken: string): Promise<PostResult> => {
    const data = await call<{ comment?: PublicComment; editKey: string; pending: boolean }>(API, {
      ...json({ ...input, turnstileToken, wordId }),
      method: "POST",
    });
    if (!data) return "error";
    if (data.comment) {
      keys.value = {
        ...keys.value,
        [data.comment.id]: { createdAt: Date.now(), key: data.editKey },
      };
      own.value = [data.comment.id, ...own.value].slice(0, 200);
      const parent = input.parentId ? find(input.parentId) : undefined;
      if (parent) parent.replies.push(data.comment);
      else if (input.parentId) void openThread(input.parentId); // parent left the list (sort/page change)
      else comments.value.unshift(data.comment);
      total.value += 1;
    }
    return told(data.pending);
  };

  const edit = async (id: number, text: string): Promise<PostResult> => {
    const data = await call<{ comment?: PublicComment; pending: boolean }>(`${API}/${id}`, {
      ...json({ editKey: keys.value[id]?.key, text }),
      method: "PATCH",
    });
    const target = find(id);
    if (!data || !target) return data ? "ok" : "error";
    if (data.comment) Object.assign(target, { ...data.comment, replies: target.replies });
    else Object.assign(target, { state: "reviewing", text: null });
    return told(data.pending);
  };

  const remove = async (id: number): Promise<boolean> => {
    const data = await call<{ deleted: boolean }>(`${API}/${id}`, {
      ...json({ editKey: keys.value[id]?.key }),
      method: "DELETE",
    });
    if (!data) return false;
    const target = find(id);
    if (target) Object.assign(target, { state: "removed", text: null });
    total.value = Math.max(0, total.value - 1);
    return true;
  };

  const vote = async (id: number, value: -1 | 0 | 1): Promise<boolean> => {
    if (busy.value.has(id)) return false;
    busy.value = new Set(busy.value).add(id);
    const data = await call<{ downvotes: number; myVote: -1 | 0 | 1; upvotes: number }>(
      "/api/comment-votes",
      { ...json({ commentId: id, value }), method: "POST" },
    );
    const next = new Set(busy.value);
    next.delete(id);
    busy.value = next;
    const target = find(id);
    if (data && target) Object.assign(target, data);
    return Boolean(data);
  };

  const report = async (id: number, reason: string, turnstileToken: string): Promise<boolean> =>
    Boolean(
      await call("/api/comment-reports", {
        ...json({ commentId: id, reason, turnstileToken }),
        method: "POST",
      }),
    );

  return {
    busy,
    canEdit,
    comments,
    edit,
    failed,
    hasMore,
    highlighted,
    isOwn,
    loadMore,
    loaded,
    loading,
    openThread,
    post,
    remove,
    report,
    sort,
    total,
    vote,
    wordId,
  };
};

export type CommentsContext = ReturnType<typeof useComments> & {
  /** Re-issues the shared captcha token after it was spent. */
  resetCaptcha: () => void;
  /** The current captcha token, or null (with a toast) while the check is still running. */
  takeToken: () => null | string;
  token: Ref<string>;
};

export const commentsKey: InjectionKey<CommentsContext> = Symbol("comments");
