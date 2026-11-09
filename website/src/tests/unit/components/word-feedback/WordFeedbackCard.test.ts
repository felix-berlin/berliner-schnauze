import WordFeedbackCard from "@components/word-feedback/WordFeedbackCard.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  answerUsage: vi.fn(),
  deleteAllFeedback: vi.fn(),
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
const eyebrow = (w: Awaited<ReturnType<typeof mountIt>>) =>
  w.find(".c-word-feedback-card__eyebrow").text();
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
    expect(w.findAll("button.c-choice--tile").map((b) => b.find("b").text())).toEqual([
      "Sag ick selbst",
      "Kenn ick",
      "Nie jehört",
    ]);
    expect(w.findAll("button")).toHaveLength(3);
    expect(w.text()).toContain("Is dit Wort bei dir noch im Einsatz?");
    expect(w.text()).toContain("Kommt mir regelmäßig übern Mund");
    // The results stay hidden until the own vote; only the header counts.
    expect(w.find(".c-word-feedback-card__bars").exists()).toBe(false);
    expect(w.text()).not.toContain("%");
    expect(w.find(".c-word-feedback-card__count").text()).toBe("Bisher 20 Stimmen");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
  });

  it("one click is the vote and leads to the results with the own answer marked", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(store.answerUsage).toHaveBeenCalledWith(7, "know", true);
    expect(w.text()).toContain("Danke für deine Stimme!");
    expect(w.text()).toContain("Kenn ick · deine Antwort");
    expect(w.text()).not.toContain("Sag ick selbst · deine Antwort");
    expect(w.text()).toContain("Willste noch mehr helfen?");
    expect(w.text()).not.toContain("Wo wohnste?");
    expect(w.find("button.c-choice--tile").exists()).toBe(false);
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
    expect(w.text()).toContain("Danke für deine Stimme!");
  });

  it("a failed vote shows the error state and Nochmal versuchen resends the same answer", async () => {
    store.answerUsage.mockResolvedValueOnce(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).not.toContain("Danke für deine Stimme!");
    // Rolled back: the unsaved choice is not shown as pressed.
    expect(w.find('[aria-pressed="true"]').exists()).toBe(false);
    expect(w.find('.c-state--error[role="alert"]').text()).toContain("Nochmal versuchen");
    await click(w, "Nochmal versuchen");
    expect(store.answerUsage).toHaveBeenCalledTimes(2);
    expect(store.answerUsage).toHaveBeenLastCalledWith(7, "know", true);
    expect(w.find(".c-state--error").exists()).toBe(false);
    expect(w.text()).toContain("Danke für deine Stimme!");
  });

  it("offline locks the tiles with aria-disabled and sends nothing", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const w = await mountIt();
    window.dispatchEvent(new Event("offline"));
    await flushPromises();
    const tiles = w.findAll("button.c-choice--tile");
    expect(tiles.every((t) => t.attributes("aria-disabled") === "true")).toBe(true);
    expect(w.find(".c-state--offline").text()).toContain("Du bist offline.");
    await tiles[0].trigger("click");
    expect(store.answerUsage).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    await flushPromises();
    expect(w.find(".c-state--offline").exists()).toBe(false);
    online.mockRestore();
  });

  it("keeps focus on the retry button, and offline it sends nothing and points to the banner", async () => {
    store.answerUsage.mockResolvedValueOnce(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    const retryButton = w.findAll("button").find((b) => b.text().includes("Nochmal versuchen"))!;
    (retryButton.element as HTMLButtonElement).focus();
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    await flushPromises();
    expect(retryButton.attributes("disabled")).toBeUndefined();
    expect(retryButton.attributes("aria-disabled")).toBe("true");
    expect(retryButton.attributes("aria-describedby")).toBe("word-feedback-offline");
    expect(document.getElementById("word-feedback-offline")).not.toBeNull();
    expect(document.activeElement).toBe(retryButton.element);
    store.answerUsage.mockClear();
    await retryButton.trigger("click");
    expect(store.answerUsage).not.toHaveBeenCalled();
    online.mockRestore();
    w.unmount();
  });

  it("retries a failed load on the first answer and does not send without state", async () => {
    $feedback.set(null);
    const w = await mountIt();
    store.loadFeedback.mockClear();
    await click(w, "Kenn ick");
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(store.sendFeedback).not.toHaveBeenCalled();
    expect(w.find('.c-state--error[role="alert"]').exists()).toBe(true);
  });

  it("disables the answers while a request is pending", async () => {
    let resolve!: (v: boolean) => void;
    store.answerUsage.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const w = await mountIt();
    await w.findAll("button")[0].trigger("click");
    expect(w.findAll("button").every((b) => b.attributes("aria-disabled") === "true")).toBe(true);
    resolve(true);
    await flushPromises();
  });

  it("skipping the area leads to the origin step and stores null", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "überspringen");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: null });
    expect($profile.get()).toEqual({ area: null });
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
  });

  it("a borough leads to the optional locality step with its localities", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Friedrichshain-Kreuzberg");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "friedrichshain-kreuzberg" });
    expect(w.text()).toContain("Welcher Kiez?");
    expect(
      w.findAll(".c-word-feedback-card__options--locality button").map((b) => b.text()),
    ).toEqual(["Friedrichshain", "Kreuzberg"]);
    expect(eyebrow(w)).toBe("Schritt 3 von 5");
  });

  it("picking a locality sends it together with its area", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
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
    await click(w, "Klar, los");
    await click(w, "Pankow");
    await click(w, "überspringen");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { locality: null });
    expect($profile.get()).toEqual({ area: "pankow", locality: null });
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
  });

  it.each(["Brandenburg", "Woanders"])("%s has no locality step", async (name) => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, name);
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
    expect(w.text()).not.toContain("Welcher Kiez?");
    expect(eyebrow(w)).toBe("Schritt 3 von 4");
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

  it("a failed locality send keeps the step and takes the answer back", async () => {
    store.sendFeedback.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Pankow");
    await click(w, "Karow");
    expect(w.text()).toContain("Welcher Kiez?");
    expect($profile.get()).toEqual({ area: "pankow" });
    const b = w.findAll("button").find((x) => x.text() === "Karow")!;
    expect(b.attributes("aria-pressed")).toBe("false");
  });

  it("grew up leads to the half step", async () => {
    $profile.set({ area: null });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
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
    await click(w, "Klar, los");
    await click(w, "Zujezogen, über 10 Jahre her");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { half: null, origin: "movedOver10" });
    expect($profile.get()).toEqual({ area: null, half: null, origin: "movedOver10" });
    expect(w.text()).toContain("Wie alt biste?");
  });

  it("finishes after the age and shows the comparison rows with data only", async () => {
    $profile.set({ area: null, half: null, origin: "movedOver10" });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
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
    expect(store.answerUsage).toHaveBeenCalledWith(7, "say", true);
    expect(store.sendFeedback).not.toHaveBeenCalled();
  });

  it("an answered word without a profile starts on the results, Stimme ändern shows the tiles", async () => {
    $feedback.set(state({ mine: { usage: "say" } }));
    const w = await mountIt();
    expect(w.text()).toContain("Danke für deine Stimme!");
    expect(w.text()).toContain("Sag ick selbst · deine Antwort");
    await click(w, "Stimme ändern");
    await click(w, "Nie jehört");
    expect(store.answerUsage).toHaveBeenCalledWith(7, "never", true);
  });

  it("an answered word with a profile starts in done and shows no further questions", async () => {
    $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
    const w = await mountIt();
    expect(w.text()).toContain("Danke fürs Mitmachen!");
    expect(w.text()).not.toContain("Willste noch mehr helfen?");
  });

  it("Angaben ändern clears the profile and asks for the area", async () => {
    $profile.set({ age: "30-39", area: null, half: null, origin: "movedOver10" });
    $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
    const w = await mountIt();
    await click(w, "Angaben ändern");
    expect($profile.get()).toEqual({});
    expect(w.text()).toContain("Wo wohnste?");
  });

  it("sends no profile answer to the analytics", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "überspringen");
    expect(track.mock.calls.map((c) => c[1])).toEqual(["usage"]);
  });

  it("Stimme zurückziehen sends usage null and shows the usage buttons again", async () => {
    $feedback.set(state({ mine: { area: "pankow", usage: "say" } }));
    store.sendFeedback.mockImplementation(async () => {
      $feedback.set(state({ mine: { usage: null } }));
      return true;
    });
    const w = await mountIt();
    await click(w, "Stimme zurückziehen");
    expect(store.sendFeedback).toHaveBeenCalledWith(7, { usage: null });
    expect(w.text()).toContain("Sag ick selbst");
    expect(w.text()).not.toContain("Danke fürs Mitmachen");
  });

  it("the remember box is off by default and toggles the store flag", async () => {
    const { $remember } = await import("@stores/wordFeedback.ts");
    $remember.set(false);
    const w = await mountIt();
    await click(w, "Kenn ick");
    const box = w.find('input[type="checkbox"]');
    expect((box.element as HTMLInputElement).checked).toBe(false);
    await box.setValue(true);
    expect($remember.get()).toBe(true);
    await box.setValue(false);
    expect($remember.get()).toBe(false);
  });

  it("Alle meine Antworten löschen asks first and then deletes through the store", async () => {
    $feedback.set(state({ mine: { area: "pankow", usage: "say" } }));
    store.deleteAllFeedback.mockResolvedValue(true);
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const w = await mountIt();
    await click(w, "Alle meine Antworten löschen");
    expect(store.deleteAllFeedback).not.toHaveBeenCalled();
    await click(w, "Alle meine Antworten löschen");
    expect(store.deleteAllFeedback).toHaveBeenCalledWith(7);
    confirm.mockRestore();
  });

  it("moves focus to the new question after an answer, not on mount", async () => {
    const w = await mountIt();
    expect(document.activeElement).toBe(document.body);
    await click(w, "Kenn ick");
    await flushPromises();
    expect(document.activeElement?.tagName).toBe("H3");
    expect(document.activeElement?.textContent?.trim()).toBe("Danke für deine Stimme!");
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
    await click(w, "Klar, los");
    await flushPromises();
    expect(document.activeElement?.tagName).toBe("H3");
    expect(document.activeElement?.textContent?.trim()).toBe("Wo wohnste?");
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
    await click(w, "Klar, los");
    await click(w, "30–39");
    await flushPromises();
    expect(document.activeElement?.className).toContain("c-word-feedback-card__done");
    w.unmount();
  });

  it("a failed usage re-vote leaves no tile pressed", async () => {
    $feedback.set(state({ mine: { usage: "say" } }));
    store.answerUsage.mockResolvedValue(false);
    const w = await mountIt();
    await click(w, "Stimme ändern");
    await click(w, "Nie jehört");
    expect(w.find('button.c-choice--tile[aria-pressed="true"]').exists()).toBe(false);
    expect(w.find(".c-state--error").exists()).toBe(true);
  });

  it("Woanders skips the Kiez and the half even for someone who grew up there", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Woanders");
    expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
    await click(w, "Hier uffjewachsen");
    expect(w.text()).toContain("Wie alt biste?");
    expect(w.text()).not.toContain("In welcher Hälfte?");
    expect(eyebrow(w)).toBe("Schritt 4 von 4");
  });

  it("Woanders drops a half answered before Zurück, on the server and in the stored profile", async () => {
    $profile.set({ half: "east", origin: "grewUp" });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Woanders");
    expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "elsewhere", half: null });
    expect($profile.get().half).toBeNull();
  });

  it("Zujezogen, unter 10 Jahren skips the half", async () => {
    $profile.set({ area: null });
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Zujezogen, unter 10 Jahren");
    expect(w.text()).toContain("Wie alt biste?");
    expect(w.text()).not.toContain("In welcher Hälfte?");
  });

  it("the progress has six segments labelled with the step, skipped ones do not count", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "Woanders");
    const bar = w.find(".c-word-feedback-card__segments");
    expect(bar.findAll(".c-word-feedback-card__segment")).toHaveLength(6);
    expect(bar.attributes("aria-label")).toBe("Schritt 3 von 4");
    expect(bar.findAll(".is-skipped")).toHaveLength(2);
  });

  it("Zurück from the first profile step returns to the results", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    await click(w, "← Zurück");
    expect(w.text()).toContain("Danke für deine Stimme!");
  });

  it("the thumbs in the results use the shared store (WordReactions)", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    expect(w.text()).toContain("Und jefällt dir ditt Wort?");
    expect(w.findAll(".c-reaction")).toHaveLength(2);
  });

  it.each([
    ["area", "überspringen", {}],
    ["origin", "Hier uffjewachsen", { area: null }],
    ["age", "30–39", { area: null, half: null, origin: "movedOver10" }],
  ])("a failed %s answer does not advance or change the profile", async (_k, label, profile) => {
    $profile.set(profile as never);
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
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
    await click(w, "Klar, los");
    expect(w.text()).toContain("1 Stimme");
    expect(w.text()).not.toContain("1 Stimmen");
  });

  describe("header, progress, back and explanation", () => {
    const segmentStates = (w: Awaited<ReturnType<typeof mountIt>>) =>
      w
        .findAll(".c-word-feedback-card__segment")
        .map((x) => x.classes().find((c) => c.startsWith("is-")));

    it("counts the votes in the header", async () => {
      const w = await mountIt();
      expect(w.find(".c-word-feedback-card__count").text()).toBe("Bisher 20 Stimmen");
      $feedback.set(state({ totals: { know: 0, never: 0, say: 1 } }));
      await flushPromises();
      expect(w.find(".c-word-feedback-card__count").text()).toBe("Bisher 1 Stimme");
      $feedback.set(state({ totals: { know: 0, never: 0, say: 0 } }));
      await flushPromises();
      expect(w.find(".c-word-feedback-card__count").text()).toBe("Noch keene Stimme");
    });

    it("always draws six segments and dashes the optional steps that do not apply", async () => {
      const w = await mountIt();
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      expect(segmentStates(w)).toEqual([
        "is-done",
        "is-current",
        "is-skipped",
        "is-open",
        "is-skipped",
        "is-open",
      ]);
      expect(eyebrow(w)).toBe("Schritt 2 von 4");
      await click(w, "Pankow");
      expect(segmentStates(w)).toHaveLength(6);
      expect(segmentStates(w)[2]).toBe("is-current");
      expect(eyebrow(w)).toBe("Schritt 3 von 5");
    });

    it("marks the answered vote with its label in the bars", async () => {
      $feedback.set(state({ mine: { usage: "know" } }));
      const w = await mountIt();
      const mine = w.find(".c-word-feedback-card__bar.is-mine");
      expect(mine.text()).toContain("Kenn ick · deine Antwort");
      expect(w.findAll(".c-word-feedback-card__bar.is-mine")).toHaveLength(1);
    });

    it("offers no back link on the first question of an edit, then one after an answer", async () => {
      $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
      const w = await mountIt();
      await click(w, "Angaben ändern");
      expect(w.text()).not.toContain("← Zurück");
      await click(w, "Pankow");
      expect(w.text()).toContain("← Zurück");
    });

    it("goes back over a step the answers made irrelevant, without sending", async () => {
      const w = await mountIt();
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      await click(w, "Woanders"); // no locality step for Woanders
      expect(w.find("h3").text()).toBe("Uffjewachsen oder zujezogen?");
      store.sendFeedback.mockClear();
      await click(w, "← Zurück");
      expect(w.find("h3").text()).toBe("Wo wohnste?");
      expect(store.sendFeedback).not.toHaveBeenCalled();
    });

    it("goes back to a step that was skipped with the button", async () => {
      const w = await mountIt();
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      await click(w, "überspringen");
      expect(w.find("h3").text()).toBe("Uffjewachsen oder zujezogen?");
      await click(w, "← Zurück");
      expect(w.find("h3").text()).toBe("Wo wohnste?");
    });

    it("re-picking the same area clears the locality and shows no stale pressed button", async () => {
      $feedback.set(state({ mine: { area: "pankow", locality: "karow", usage: "say" } }));
      const w = await mountIt();
      await click(w, "Angaben ändern");
      await click(w, "Pankow");
      await click(w, "Karow");
      expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "pankow", locality: "karow" });
      await click(w, "← Zurück");
      await click(w, "← Zurück");
      await click(w, "Pankow");
      // The server still holds the locality, so the area send clears it.
      expect(store.sendFeedback).toHaveBeenLastCalledWith(7, { area: "pankow", locality: null });
      expect($profile.get()).toEqual({ area: "pankow" });
      expect(w.find("h3").text()).toBe("Welcher Kiez?");
      const b = w.findAll("button").find((x) => x.text() === "Karow")!;
      expect(b.attributes("aria-pressed")).toBe("false");
    });

    it("opens the explanation on the area step; the toggle stays and folds it", async () => {
      const w = await mountIt();
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      const toggle = () => w.find('button[aria-controls="word-feedback-why"]');
      expect(w.find("#word-feedback-why").isVisible()).toBe(true);
      expect(toggle().attributes("aria-expanded")).toBe("true");
      await toggle().trigger("click");
      expect(w.find("#word-feedback-why").isVisible()).toBe(false);
      expect(toggle().attributes("aria-expanded")).toBe("false");
      await toggle().trigger("click");
      expect(w.find("#word-feedback-why").isVisible()).toBe(true);
    });

    it("folds the explanation again on the next step", async () => {
      const w = await mountIt();
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      await click(w, "überspringen");
      expect(w.find("#word-feedback-why").isVisible()).toBe(false);
      expect(w.find('button[aria-controls="word-feedback-why"]').attributes("aria-expanded")).toBe(
        "false",
      );
    });
  });

  describe("reset and load", () => {
    it("Angaben ändern clears the stored profile on the server, not the vote", async () => {
      $profile.set({ age: "30-39", area: null, half: null, origin: "movedOver10" });
      $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
      const w = await mountIt();
      await click(w, "Angaben ändern");
      expect(store.sendFeedback).toHaveBeenCalledWith(7, {
        age: null,
        area: null,
        half: null,
        locality: null,
        origin: null,
      });
      expect($profile.get()).toEqual({});
    });

    it("keeps the profile when clearing it on the server fails", async () => {
      $profile.set({ age: "30-39", area: null, half: null, origin: "movedOver10" });
      $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
      store.sendFeedback.mockResolvedValue(false);
      const w = await mountIt();
      await click(w, "Angaben ändern");
      expect($profile.get()).toMatchObject({ age: "30-39" });
      expect(w.text()).toContain("Angaben ändern");
    });

    it("tells a failed first load right away", async () => {
      $feedback.set(null);
      const w = await mountIt();
      expect(w.find('[role="alert"]').exists()).toBe(true);
    });

    it("labels the usage group and keeps the live region on the results only", async () => {
      const w = await mountIt();
      expect(w.find('[role="group"]').attributes("aria-labelledby")).toBe("word-feedback-title");
      await click(w, "Kenn ick");
      await click(w, "Klar, los");
      const live = w.findAll("[aria-live]");
      expect(live).toHaveLength(1);
      expect(live[0].find(".c-word-feedback-card__bars").exists()).toBe(true);
    });
  });

  it("animates a step change but not the first paint", async () => {
    const w = await mountIt();
    await click(w, "Kenn ick");
    await click(w, "Klar, los");
    expect(w.find(".c-word-feedback-card__step").classes()).toContain("is-entering");
    $feedback.set(state({ mine: { age: "30-39", usage: "say" } }));
    const again = await mountIt();
    expect(again.find(".c-word-feedback-card__done").classes()).not.toContain("is-entering");
  });
});
