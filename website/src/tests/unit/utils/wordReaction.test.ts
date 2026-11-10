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
import { toggleReaction } from "@utils/wordReaction.ts";

const FALLBACK = { fallbackMessage: "Ditt hat nich jeklappt." };

describe("toggleReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $feedback.set(null);
    $profile.set({});
    store.loadFeedback.mockResolvedValue(undefined);
    store.sendFeedback.mockResolvedValue(true);
  });

  it("sets a new reaction with the stored profile and tracks the reaction", async () => {
    $feedback.set({ mine: { reaction: null }, totals: { dislike: 0, like: 0 } } as never);
    $profile.set({ age: "30-39" });
    await toggleReaction(1, "like");
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "like");
    expect(store.sendFeedback).toHaveBeenCalledWith(
      1,
      { age: "30-39", reaction: "like" },
      FALLBACK,
    );
  });

  it("takes the stored reaction back: sends null and tracks 'none'", async () => {
    $feedback.set({ mine: { reaction: "dislike" }, totals: { dislike: 1, like: 0 } } as never);
    await toggleReaction(1, "dislike");
    expect(track).toHaveBeenCalledWith("Word Feedback", "reaction", "none");
    expect(store.sendFeedback).toHaveBeenCalledWith(1, { reaction: null }, FALLBACK);
  });

  it("retries a failed GET first when there is no state", async () => {
    await toggleReaction(1, "like");
    expect(store.loadFeedback).toHaveBeenCalledWith(1);
  });
});
