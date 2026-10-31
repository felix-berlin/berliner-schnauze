import type { PublicComment } from "@utils/commentSchema.ts";
import type { InjectionKey, Ref } from "vue";

import { createToastNotify } from "@stores/toastNotify.ts";
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
const call = async <T>(url: string, init?: RequestInit): Promise<null | T> => {
  try {
    const res = await fetch(url, init);
    if (res.status === 429) {
      createToastNotify({
        message: "Ma langsam, Keule – versuch's gleich nochmal.",
        status: "warning",
      });
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      createToastNotify({
        message: body.error || "Dit hat leider nich geklappt.",
        status: "error",
      });
      return null;
    }
    return body;
  } catch {
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
  const busy = ref(new Set<number>());
  let page = 0;
  let generation = 0;

  const keys = useLocalStorage<Keys>("bs-comment-keys", {});
  const tick = ref(0);
  const ticker = useIntervalFn(() => tick.value++, 1000, { immediate: false });
  const fresh = (k: { createdAt: number }) => Date.now() - k.createdAt < EDIT_WINDOW_MS;
  keys.value = Object.fromEntries(Object.entries(keys.value).filter(([, k]) => fresh(k)));
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
    if (!data) return;
    page += 1;
    loaded.value = true;
    // An own post shifts the offset by one, so a page can repeat a comment already shown.
    const shown = new Set(comments.value.map((c) => c.id));
    comments.value.push(...data.comments.filter((c) => !shown.has(c.id)));
    hasMore.value = data.hasMore;
    total.value = data.total;
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
      else if (!input.parentId) comments.value.unshift(data.comment);
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
    hasMore,
    isOwn,
    loadMore,
    loaded,
    loading,
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
