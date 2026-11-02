import WordFeedbackCard from "@components/word-feedback/WordFeedbackCard.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  answerUsage: vi.fn(),
  loadFeedback: vi.fn(),
  sendFeedback: vi.fn(),
}));
vi.mock("@stores/wordFeedback.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@stores/wordFeedback.ts")>("@stores/wordFeedback.ts");
  return { ...actual, ...store };
});
const track = vi.hoisted(() => vi.fn());
vi.mock("@utils/analytics", () => ({ trackEvent: track }));

import { $feedback, $profile } from "@stores/wordFeedback.ts";

const state = (over: Record<string, unknown> = {}) =>
  ({
    compare: { area: null, east: 60, locality: null, moved: null, west: null },
    mine: { usage: null },
    totals: { dislike: 0, know: 5, like: 0, never: 5, say: 10 },
    ...over,
  }) as never;

const mountIt = async () => {
  const w = mount(WordFeedbackCard, { attachTo: document.body, props: { wordId: 7 } });
  await flushPromises();
  return w;
};
const click = async (w: Awaited<ReturnType<typeof mountIt>>, text: string) => {
  const b = w.findAll("button").find((x) => x.text().includes(text));
  expect(b !== undefined).toBe(true);
  await b!.trigger("click");
  await flushPromises();
};

describe("WordFeedbackCard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    $feedback.set(state());
    $profile.set({});
    store.loadFeedback.mockImplementation(async () => {});
    store.sendFeedback.mockResolvedValue(true);
    store.answerUsage.mockResolvedValue(true);
  });

  it("starts with the three usage buttons only and loads the state", async () => {
    const w = await mountIt();
    expect(w.text()).toContain("Sagste det noch?");
    expect(w.findAll("button").map((b) => b.text())).toEqual([
      "Sag ick selbst",
      "Kenn ick",
      "Nie jehört",
    ]);
    expect(w.text()).not.toContain("Stimmen");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
  });

  it("shows bars and the area step after a usage answer", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(store.answerUsage).toHaveBeenCalledWith(7, "know");
    expect(w.text()).toContain("Wo wohnste?");
    expect(w.text()).toContain("10 Stimmen");
    expect(w.text()).toContain("50 %");
    expect(track).toHaveBeenCalledWith("Word Feedback", "usage", "know");
  });

  it("advances even when the store update already marks the word as answered", async () => {
    store.answerUsage.mockImplementation(async () => {
      $feedback.set(state({ mine: { usage: "know" } }));
      return true;
    });
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).toContain("Wo wohnste?");
  });

  it("stays on usage when the send fails", async () => {
    store.answerUsage.mockResolvedValue(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).not.toContain("Wo wohnste?");
    expect(w.find('[aria-pressed="true"]').text()).toBe("Kenn ick");
  });

  it("retries a failed load on the first answer and does not send without state", async () => {
    $feedback.set(null);
    const w = await mountIt();
    store.loadFeedback.mockClear();
    await click(w, "Kenn ick");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(store.sendFeedback).not.toHaveBeenCalled();
    expect(w.find('[role="alert"]').exists()).toBe(true);
  });

  it("disables the answers while a request is pending", async () => {
    let resolve!: (v: boolean) => void;
    store.answerUsage.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await w.findAll("button")[0].trigger("click");
    expect(w.findAll("button").every((b) => b.attributes("disabled") !== undefined)).toBe(true);
    resolve(true);
    await flushPromises();
  });

  it("skipping the area leads to the origin step and stores null", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "überspringen");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: null });
    expect($profile.get()).toEqual({ area: null });
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
  });

  it("a borough leads to the optional locality step with its localities", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Friedrichshain-Kreuzberg");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "friedrichshain-kreuzberg" });
    expect(w.text()).toContain("Welcher Kiez?");
    expect(w.findAll(".c-word-feedback-card__options--kiez button").map((b) => b.text())).toEqual([
      "Friedrichshain",
      "Kreuzberg",
    ]);
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("Schritt 3 von 5");
  });

  it("picking a locality sends it together with its area", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Friedrichshain-Kreuzberg");
    await click(w, "Kreuzberg");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, {
      area: "friedrichshain-kreuzberg",
      locality: "kreuzberg",
    });
    expect($profile.get()).toEqual({ area: "friedrichshain-kreuzberg", locality: "kreuzberg" });
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
  });

  it("skipping the locality sends null without an area", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Pankow");
    await click(w, "überspringen");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { locality: null });
    expect($profile.get()).toEqual({ area: "pankow", locality: null });
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
  });

  it.each(["Brandenburg", "Woanders"])("%s has no locality step", async (name) => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, name);
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
    expect(w.text()).not.toContain("Welcher Kiez?");
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("Schritt 3 von 4");
  });

  it("changing the area clears the earlier locality and asks again", async () => {
    $feedback.set(state({ mine: { locality: "prenzlauer-berg", usage: "say" } }));
    const w = await mountIt();
    await click(w, "Angaben ändern");
    await click(w, "Neukölln");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "neukoelln", locality: null });
    // For the profile the new area's locality is "not asked yet", not skipped.
    expect($profile.get()).toEqual({ area: "neukoelln" });
    expect(w.text()).toContain("Welcher Kiez?");
  });

  it("shows the locality comparison row only with data", async () => {
    $profile.set({ age: null, area: "pankow", half: null, locality: "karow", origin: null });
    $feedback.set(
      state({
        compare: { area: 50, east: null, locality: 70, moved: null, west: null },
        mine: { area: "pankow", locality: "karow", usage: "say" },
      }),
    );
    const w = await mountIt();
    expect(w.text()).toContain("in Pankow: 50 % sagen det");
    expect(w.text()).toContain("in Karow: 70 % sagen det");
    $feedback.set(
      state({
        compare: { area: 50, east: null, locality: null, moved: null, west: null },
        mine: { area: "pankow", locality: "karow", usage: "say" },
      }),
    );
    await flushPromises();
    expect(w.text()).not.toContain("in Karow");
  });

  it("a failed locality send keeps the step and the answer highlighted", async () => {
    store.sendFeedback.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Pankow");
    await click(w, "Karow");
    expect(w.text()).toContain("Welcher Kiez?");
    expect($profile.get()).toEqual({ area: "pankow" });
    const b = w.findAll("button").find((x) => x.text() === "Karow")!;
    expect(b.attributes("aria-pressed")).toBe("true");
  });

  it("grew up leads to the half step", async () => {
    $profile.set({ area: null });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Hier uffjewachsen");
    expect(w.text()).toContain("In welcher Hälfte?");
    await click(w, "West");
    // The API rejects a half without origin grewUp in the same request.
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { half: "west", origin: "grewUp" });
    expect(w.text()).toContain("Wie alt biste?");
  });

  it("moved over 10 years goes to the age step with half null", async () => {
    $profile.set({ area: null });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Zujezogen, über 10 Jahre her");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { half: null, origin: "movedOver10" });
    expect($profile.get()).toEqual({ area: null, half: null, origin: "movedOver10" });
    expect(w.text()).toContain("Wie alt biste?");
  });

  it("finishes after the age and shows the comparison rows with data only", async () => {
    $profile.set({ area: null, half: null, origin: "movedOver10" });
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).toContain("Wie alt biste?");
    await click(w, "30–39");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { age: "30-39" });
    expect(w.text()).toContain("Ost-Berliner");
    expect(w.text()).not.toContain("West-Berliner");
    expect(w.text()).toContain("Angaben ändern");
  });

  it("answering usage with a complete profile goes straight to done", async () => {
    $profile.set({ age: "30-39", area: null, half: null, origin: "movedOver10" });
    const w = await mountIt();
    await click(w, "Sag ick selbst");
    expect(w.text()).toContain("Angaben ändern");
    expect(w.text()).not.toContain("Wo wohnste?");
  });

  it("attaches the stored profile to a usage answer via answerUsage", async () => {
    $profile.set({ area: "pankow", origin: "grewUp" });
    const w = await mountIt();
    await click(w, "Sag ick selbst");
    expect(store.answerUsage).toHaveBeenCalledWith(7, "say");
    expect(store.sendFeedback).not.toHaveBeenCalled();
  });

  it("starts in the done state for an answered word, usage still clickable", async () => {
    $feedback.set(state({ mine: { usage: "say" } }));
    const w = await mountIt();
    expect(w.text()).toContain("Angaben ändern");
    expect(w.findAll("button")[0].attributes("aria-pressed")).toBe("true");
    await click(w, "Nie jehört");
    expect(store.answerUsage).toHaveBeenCalledWith(7, "never");
  });

  it("Angaben ändern clears the profile and asks for the area", async () => {
    $profile.set({ age: "30-39", area: null, half: null, origin: "movedOver10" });
    $feedback.set(state({ mine: { usage: "say" } }));
    const w = await mountIt();
    await click(w, "Angaben ändern");
    expect($profile.get()).toEqual({});
    expect(w.text()).toContain("Wo wohnste?");
  });

  it("moves focus to the new question after an answer, not on mount", async () => {
    const w = await mountIt();
    expect(document.activeElement).toBe(document.body);
    await click(w, "Kenn ick");
    await flushPromises();
    expect(document.activeElement?.tagName).toBe("H3");
    expect(document.activeElement?.textContent).toBe("Wo wohnste?");
    w.unmount();
  });

  it("does not take focus when a revisit starts in the done state", async () => {
    $feedback.set(state({ mine: { usage: "say" } }));
    const w = await mountIt();
    expect(document.activeElement).toBe(document.body);
    w.unmount();
  });

  it("focuses the done box after the last step", async () => {
    $profile.set({ area: null, half: null, origin: "movedOver10" });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "30–39");
    await flushPromises();
    expect(document.activeElement?.className).toContain("c-word-feedback-card__done");
    w.unmount();
  });

  it("clears a failed usage re-vote back to the saved choice", async () => {
    $feedback.set(state({ mine: { usage: "say" } }));
    store.answerUsage.mockResolvedValue(false);
    const w = await mountIt();
    await click(w, "Nie jehört");
    expect(w.findAll("button")[0].attributes("aria-pressed")).toBe("true");
    expect(w.findAll("button")[2].attributes("aria-pressed")).toBe("false");
  });

  it.each([
    ["area", "überspringen", {}],
    ["origin", "Hier uffjewachsen", { area: null }],
    ["age", "30–39", { area: null, half: null, origin: "movedOver10" }],
  ])("a failed %s answer does not advance or change the profile", async (_k, label, profile) => {
    $profile.set(profile as never);
    const w = await mountIt();
    await click(w, "Kenn ick");
    store.sendFeedback.mockResolvedValue(false);
    const heading = w.find("h3").text();
    await click(w, label);
    expect(w.find("h3").text()).toBe(heading);
    expect($profile.get()).toEqual(profile);
  });

  it("uses the singular for one vote", async () => {
    $feedback.set(state({ totals: { know: 0, never: 0, say: 1 } }));
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).toContain("1 Stimme");
    expect(w.text()).not.toContain("1 Stimmen");
  });

  describe("step dots", () => {
    const fine = (matches: boolean) =>
      vi.stubGlobal("matchMedia", (q: string) => ({
        addEventListener: () => {},
        matches,
        media: q,
        removeEventListener: () => {},
      }));
    const editing = async (profile = {}) => {
      $feedback.set(state({ mine: { usage: "say" } }));
      const w = await mountIt();
      await click(w, "Angaben ändern");
      if (Object.keys(profile).length) {
        $profile.set(profile as never);
        await flushPromises();
      }
      return w;
    };
    const dotButtons = (w: Awaited<ReturnType<typeof mountIt>>) =>
      w.findAll("button.c-word-feedback-card__dot-button");

    afterEach(() => vi.unstubAllGlobals());

    it("are plain, non-interactive dots when not editing", async () => {
      fine(true);
      const w = await mountIt();
      await click(w, "Kenn ick");
      expect(w.find('[role="img"][aria-label="Schritt 2 von 4"]').exists()).toBe(true);
      expect(dotButtons(w)).toHaveLength(0);
    });

    it("stay plain dots on a touch device even when editing", async () => {
      fine(false);
      const w = await editing();
      expect(dotButtons(w)).toHaveLength(0);
    });

    it("jump to a step without sending or storing anything while editing", async () => {
      fine(true);
      const w = await editing();
      const buttons = dotButtons(w);
      expect(buttons.map((b) => b.attributes("aria-label"))).toEqual([
        "Schritt 2: Wo wohnste?",
        "Schritt 3: Uffjewachsen oder zujezogen?",
        "Schritt 4: Wie alt biste?",
      ]);
      expect(buttons[0].attributes("aria-current")).toBe("step");
      await buttons[2].trigger("click");
      await flushPromises();
      expect(w.find("h3").text()).toBe("Wie alt biste?");
      expect(store.sendFeedback).not.toHaveBeenCalled();
      expect(store.answerUsage).not.toHaveBeenCalled();
      expect($profile.get()).toEqual({});
      expect(dotButtons(w)[2].attributes("aria-current")).toBe("step");
    });

    it("offers the half dot only for someone who grew up here", async () => {
      fine(true);
      const w = await editing();
      expect(dotButtons(w)).toHaveLength(3);
      w.unmount();
      const grew = await editing({ origin: "grewUp" });
      expect(dotButtons(grew).map((b) => b.attributes("aria-label"))).toContain(
        "Schritt 4: In welcher Hälfte?",
      );
    });
  });

  it("animates a step change but not the first paint", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.find(".c-word-feedback-card__step").classes()).toContain("is-entering");
    $feedback.set(state({ mine: { usage: "say" } }));
    const again = await mountIt();
    expect(again.find(".c-word-feedback-card__done").classes()).not.toContain("is-entering");
  });
});
