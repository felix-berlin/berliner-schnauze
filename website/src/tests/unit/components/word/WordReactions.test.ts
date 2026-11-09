import WordReactions from "@components/word/WordReactions.vue";
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

const state = (like: number, reaction: "like" | "dislike" | null = null, dislike = 3) =>
  ({ mine: { reaction }, totals: { dislike, like } }) as never;

const mountIt = async () => {
  const w = mount(WordReactions, { props: { wordId: 7 } });
  await flushPromises();
  return w;
};
const buttons = (w: Awaited<ReturnType<typeof mountIt>>) => w.findAll("button");

describe("WordReactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $feedback.set(null);
    $profile.set({});
    store.loadFeedback.mockImplementation(async () => {});
    store.sendFeedback.mockResolvedValue(true);
  });

  it("rests with Like only: icon, count, loads on mount (Spec §9, no Dislike without a set one)", async () => {
    $feedback.set(state(128));
    const w = await mountIt();
    expect(buttons(w)).toHaveLength(1);
    const like = buttons(w)[0];
    expect(w.classes()).toContain("c-reaction-group");
    expect(like.attributes("aria-label")).toBe("Jefällt ma, 128");
    expect(like.find('[data-testid="icon-lucide-thumbs-up"]').exists()).toBe(true);
    expect(like.text()).toBe("128");
    expect(w.find(".c-reaction-group__more").exists()).toBe(false);
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
  });

  it("shows a pressed Dislike next to Like once it is set", async () => {
    $feedback.set(state(128, "dislike"));
    const w = await mountIt();
    const [like, dislike] = buttons(w);
    expect(like.attributes("aria-pressed")).toBe("false");
    expect(dislike.classes()).toContain("c-reaction-group__more");
    expect(dislike.attributes("aria-pressed")).toBe("true");
    expect(dislike.attributes("aria-label")).toBe("Nee, 3");
    expect(dislike.find('[data-testid="icon-lucide-thumbs-down"]').exists()).toBe(true);
  });

  it("taking Dislike back sends reaction null, removes the button and hands the focus to Like", async () => {
    $feedback.set(state(5, "dislike"));
    store.sendFeedback.mockImplementation(async () => {
      $feedback.set(state(5, null, 2));
      return true;
    });
    const w = mount(WordReactions, { attachTo: document.body, props: { wordId: 7 } });
    await flushPromises();
    await buttons(w)[1].trigger("click");
    await flushPromises();
    expect(store.sendFeedback).toHaveBeenCalledWith(
      7,
      { reaction: null },
      "Ditt hat nich jeklappt.",
    );
    expect(buttons(w)).toHaveLength(1);
    expect(document.activeElement).toBe(buttons(w)[0].element);
    w.unmount();
  });

  it("shows a dash and no number in the label before the state loaded", async () => {
    const w = await mountIt();
    expect(buttons(w)[0].text()).toBe("–");
    expect(buttons(w)[0].attributes("aria-label")).toBe("Jefällt ma");
  });

  it("sends reaction plus stored profile on click", async () => {
    $profile.set({ area: "pankow" });
    $feedback.set(state(5));
    const w = await mountIt();
    await buttons(w)[0].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledWith(
      7,
      { area: "pankow", reaction: "like" },
      "Ditt hat nich jeklappt.",
    );
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "like");
  });

  it("counts optimistically while the request runs and keeps the result the server returns", async () => {
    $feedback.set(state(5));
    let resolve!: (v: boolean) => void;
    store.sendFeedback.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await buttons(w)[0].trigger("click");
    expect(buttons(w)[0].text()).toBe("6");
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("true");
    // the store applies the server state before the promise resolves
    $feedback.set(state(6, "like"));
    resolve(true);
    await flushPromises();
    expect(buttons(w)[0].text()).toBe("6");
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("true");
  });

  it("rolls back when the request fails", async () => {
    $feedback.set(state(5));
    store.sendFeedback.mockResolvedValue(false);
    const w = await mountIt();
    await buttons(w)[0].trigger("click");
    await flushPromises();
    expect(buttons(w)[0].text()).toBe("5");
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("false");
  });

  it("switching from Dislike to Like moves the count in one step (exclusive)", async () => {
    $feedback.set(state(5, "dislike", 3));
    let resolve!: (v: boolean) => void;
    store.sendFeedback.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await buttons(w)[0].trigger("click");
    expect(buttons(w)[0].text()).toBe("6");
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("true");
    // Optimistically the Dislike is gone and counted off.
    expect(buttons(w)).toHaveLength(1);
    resolve(false);
  });

  it("clicking the active reaction sends reaction null only", async () => {
    $feedback.set(state(5, "like"));
    const w = await mountIt();
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("true");
    expect(buttons(w)).toHaveLength(1);
    await buttons(w)[0].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledWith(
      7,
      { reaction: null },
      "Ditt hat nich jeklappt.",
    );
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "none");
  });

  it("retries loading before sending when the GET failed", async () => {
    const w = await mountIt();
    store.loadFeedback.mockClear();
    await buttons(w)[0].trigger("click");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(store.sendFeedback).toHaveBeenCalledWith(
      7,
      { reaction: "like" },
      "Ditt hat nich jeklappt.",
    );
  });

  it("ignores a second click while pending and keeps the button focusable (aria-disabled, not disabled)", async () => {
    $feedback.set(state(5));
    let resolve!: (v: boolean) => void;
    store.sendFeedback.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await buttons(w)[0].trigger("click");
    expect(buttons(w)[0].attributes("aria-disabled")).toBe("true");
    expect(buttons(w)[0].attributes("disabled")).toBeUndefined();
    await buttons(w)[0].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledTimes(1);
    resolve(true);
  });
});
