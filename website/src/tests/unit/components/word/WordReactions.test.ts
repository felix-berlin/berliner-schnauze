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

  it("renders the group with Like and Dislike, icons and counts, loads on mount", async () => {
    $feedback.set(state(128));
    const w = await mountIt();
    const [like, dislike] = buttons(w);
    expect(w.classes()).toContain("c-reaction-group");
    expect(dislike.classes()).toContain("c-reaction-group__more");
    expect(like.attributes("aria-label")).toBe("Jefällt ma, 128");
    expect(dislike.attributes("aria-label")).toBe("Nee, 3");
    expect(like.find('[data-testid="icon-lucide-thumbs-up"]').exists()).toBe(true);
    expect(dislike.find('[data-testid="icon-lucide-thumbs-down"]').exists()).toBe(true);
    expect(like.text()).toBe("128");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
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

  it("switching Like to Dislike moves the count in one step (exclusive)", async () => {
    $feedback.set(state(5, "like", 3));
    let resolve!: (v: boolean) => void;
    store.sendFeedback.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await buttons(w)[1].trigger("click");
    expect(buttons(w)[0].text()).toBe("4");
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("false");
    expect(buttons(w)[1].text()).toBe("4");
    expect(buttons(w)[1].attributes("aria-pressed")).toBe("true");
    resolve(false);
  });

  it("clicking the active reaction sends reaction null only", async () => {
    $feedback.set(state(5, "like"));
    const w = await mountIt();
    expect(buttons(w)[0].attributes("aria-pressed")).toBe("true");
    expect(buttons(w)[1].attributes("aria-pressed")).toBe("false");
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
    await buttons(w)[1].trigger("click");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(store.sendFeedback).toHaveBeenCalledWith(
      7,
      { reaction: "dislike" },
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
    await buttons(w)[1].trigger("click");
    expect(store.sendFeedback).toHaveBeenCalledTimes(1);
    resolve(true);
  });
});
