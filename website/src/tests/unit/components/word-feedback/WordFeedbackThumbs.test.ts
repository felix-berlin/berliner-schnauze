import WordFeedbackThumbs from "@components/word-feedback/WordFeedbackThumbs.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ loadFeedback: vi.fn(), sendFeedback: vi.fn() }));
vi.mock("@stores/wordFeedback.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@stores/wordFeedback.ts")>("@stores/wordFeedback.ts");
  return { ...actual, ...store };
});
const track = vi.hoisted(() => vi.fn());
vi.mock("@utils/analytics", () => ({ trackEvent: track }));

import { $feedback, $profile } from "@stores/wordFeedback.ts";

const state = (like: number, reaction: "like" | "dislike" | null = null) =>
  ({ mine: { reaction }, totals: { dislike: 3, like } }) as never;

const mountIt = async () => {
  const w = mount(WordFeedbackThumbs, { props: { wordId: 7 } });
  await flushPromises();
  return w;
};

describe("WordFeedbackThumbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $feedback.set(null);
    $profile.set({});
    store.loadFeedback.mockImplementation(async () => {});
    store.sendFeedback.mockResolvedValue(true);
  });

  it("renders both buttons with labels and icons, loads on mount", async () => {
    const w = await mountIt();
    const [like, dislike] = w.findAll("button");
    expect(like.text()).toContain("Jefällt ma");
    expect(dislike.text()).toContain("Nee");
    // defineAsyncComponent resolves after the dynamic import
    await vi.waitFor(() => {
      expect(like.find('[data-testid="icon-lucide-thumbs-up"]').exists()).toBe(true);
      expect(dislike.find('[data-testid="icon-lucide-thumbs-down"]').exists()).toBe(true);
    });
    expect(like.text()).not.toMatch(/\d/);
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
  });

  it("shows the like count once loaded", async () => {
    $feedback.set(state(128));
    const w = await mountIt();
    expect(w.findAll("button")[0].text()).toContain("128");
  });

  it("sends reaction plus stored profile on click", async () => {
    $profile.set({ area: "pankow" });
    const w = await mountIt();
    await w.findAll("button")[0].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledWith(7, { area: "pankow", reaction: "like" });
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "like");
  });

  it("clicking the active reaction sends reaction null only", async () => {
    $feedback.set(state(5, "like"));
    const w = await mountIt();
    const like = w.findAll("button")[0];
    expect(like.attributes("aria-pressed")).toBe("true");
    expect(w.findAll("button")[1].attributes("aria-pressed")).toBe("false");
    await like.trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledWith(7, { reaction: null });
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "none");
  });

  it("retries loading before sending when the GET failed", async () => {
    const w = await mountIt();
    store.loadFeedback.mockClear();
    await w.findAll("button")[1].trigger("click");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(store.sendFeedback).toHaveBeenCalledWith(7, { reaction: "dislike" });
  });

  it("ignores a second click while a request is pending", async () => {
    let resolve!: (v: boolean) => void;
    store.sendFeedback.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await w.findAll("button")[0].trigger("click");
    expect(w.findAll("button")[0].attributes("disabled")).toBeDefined();
    await w.findAll("button")[1].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledTimes(1);
    resolve(true);
  });

  it("links to the usage card", async () => {
    const w = await mountIt();
    expect(w.find("a").attributes("href")).toBe("#sagste-det-noch");
    expect(w.find("a").text()).toContain("Sagste det noch? Hier abstimmen");
  });
});
