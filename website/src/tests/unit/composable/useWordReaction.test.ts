// @vitest-environment jsdom
import { useWordReaction } from "@composables/useWordReaction.ts";
import { $feedback, deleteFeedback } from "@stores/wordFeedback.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const totals = { dislike: 0, know: 0, like: 3, never: 0, say: 0 };
const state = (reaction: "dislike" | "like" | null) => ({
  compare: {},
  mine: reaction ? { reaction } : null,
  totals,
});

let patch: () => { body: unknown; ok?: boolean; status?: number };
const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  const r = init?.method === "PATCH" ? patch() : { body: state(null) };
  return { json: async () => r.body, ok: r.ok ?? true, status: r.status ?? 200 };
});

const mountIt = async () => {
  let api!: ReturnType<typeof useWordReaction>;
  mount(
    defineComponent({
      setup() {
        api = useWordReaction(() => 7);
        return () => null;
      },
    }),
  );
  await flushPromises();
  return api;
};

describe("useWordReaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    $feedback.set(null);
    patch = () => ({ body: { ...state("like"), totals: { ...totals, like: 4 } } });
  });

  it("keeps the choice after a stored answer without totals (200, stored: true): no rollback", async () => {
    const api = await mountIt();
    patch = () => ({
      body: { error: "Zahlen jerade nich da.", mine: { reaction: "like" }, stored: true },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await api.react("like");
    expect(api.current.value).toBe("like");
  });

  it("rolls back when the request fails", async () => {
    const api = await mountIt();
    patch = () => ({ body: { error: "kaputt" }, ok: false, status: 502 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await api.react("like");
    expect(api.current.value).toBeNull();
  });

  it("drops the reaction when the visitor deletes their answers", async () => {
    const api = await mountIt();
    await api.react("like");
    expect(api.current.value).toBe("like");
    await deleteFeedback(7);
    expect(api.current.value).toBeNull();
  });
});
