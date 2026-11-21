import HomePoll from "@components/HomePoll.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ answerUsage: vi.fn(), loadFeedback: vi.fn() }));
vi.mock("@stores/wordFeedback.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@stores/wordFeedback.ts")>("@stores/wordFeedback.ts");
  return { ...actual, ...store };
});
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

import { $feedback, $sendError } from "@stores/wordFeedback.ts";

const state = (totals: { know: number; never: number; say: number }, usage: string | null = null) =>
  ({
    compare: { area: null, east: null, locality: null, moved: null, west: null },
    mine: usage ? { usage } : null,
    totals: { dislike: 0, like: 0, ...totals },
  }) as never;

const props = {
  lemma: "Quarkwolke",
  meaning: "ein erfundenes Wort",
  slug: "quarkwolke",
  total: 2317,
  wordId: 7,
};

const mountIt = async () => {
  const w = mount(HomePoll, { attachTo: document.body, props });
  await flushPromises();
  return w;
};
type W = Awaited<ReturnType<typeof mountIt>>;
const tile = (w: W, label: string) => w.findAll("button").find((b) => b.text().includes(label))!;
const dots = (w: W) => w.findAll('[role="img"] > i');

describe("HomePoll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    $feedback.set(state({ know: 1000, never: 317, say: 1000 }));
    $sendError.set(null);
    store.loadFeedback.mockImplementation(async () => {});
  });

  it("shows the card, the question, three tiles and the vote count before the vote", async () => {
    const w = await mountIt();
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
    expect(w.find('a[href="/wort/quarkwolke"]').text()).toContain("Dit Wort steht zur Abstimmung");
    expect(w.text()).toContain("Sagste „Quarkwolke“ noch?");
    expect(w.find('[role="group"]').attributes("aria-label")).toBe("Sagste det noch?");
    expect(w.findAll('[role="group"] button').map((b) => b.find("b").text())).toEqual([
      "Sag ick selbst",
      "Kenn ick",
      "Nie jehört",
    ]);
    expect(w.text()).toContain("Schon 2.317 Stimmen – wat sagst du? Dit Ergebnis siehste danach.");
    expect(dots(w)).toHaveLength(0);
  });

  it("sends the usage answer and shows 100 dots with the own vote marked", async () => {
    store.answerUsage.mockImplementation(async () => {
      $feedback.set(state({ know: 44, never: 15, say: 41 }, "know"));
      return true;
    });
    const w = await mountIt();
    await tile(w, "Kenn ick").trigger("click");
    await flushPromises();
    expect(store.answerUsage).toHaveBeenCalledWith(7, "know", true);
    expect(w.find('[role="group"]').exists()).toBe(false);
    const all = dots(w);
    expect(all).toHaveLength(100);
    expect(all.filter((d) => d.attributes("data-usage") === "know")).toHaveLength(44);
    const mine = all.filter((d) => d.attributes("data-state") === "mine");
    expect(mine).toHaveLength(1);
    expect(mine[0].attributes("data-usage")).toBe("know");
    expect(w.find('[role="img"]').attributes("aria-label")).toBe(
      "41 Prozent sagen es selbst, 44 Prozent kennen es, 15 Prozent haben es nie gehört",
    );
    expect(w.find("li[data-state='mine']").text()).toContain("deine Stimme");
    expect(w.find("[aria-live='polite']").exists()).toBe(true);
    expect(document.activeElement).toBe(w.find("h3").element);
  });

  it("rounds equal thirds to exactly 100 dots (largest remainder)", async () => {
    $feedback.set(state({ know: 1, never: 1, say: 1 }, "never"));
    const w = await mountIt();
    const counts = ["say", "know", "never"].map(
      (u) => dots(w).filter((d) => d.attributes("data-usage") === u).length,
    );
    expect(counts.reduce((a, b) => a + b)).toBe(100);
    expect(counts.toSorted((a, b) => a - b)).toEqual([33, 33, 34]);
  });

  it("shows the result at once for a device that already voted, without tiles and without moving focus", async () => {
    $feedback.set(state({ know: 2, never: 1, say: 7 }, "say"));
    const w = await mountIt();
    expect(w.find('[role="group"]').exists()).toBe(false);
    expect(dots(w)).toHaveLength(100);
    expect(document.activeElement).not.toBe(w.find("h3").element);
  });

  it("keeps the tiles and shows the server reason when the vote fails", async () => {
    store.answerUsage.mockImplementation(async () => {
      $sendError.set("Heute schon zu oft abjestimmt.");
      return false;
    });
    const w = await mountIt();
    await tile(w, "Sag ick selbst").trigger("click");
    await flushPromises();
    expect(w.find('[role="group"]').exists()).toBe(true);
    const alert = w.find('.c-state[data-variant~="error"][role="alert"]');
    expect(alert.text()).toContain("Heute schon zu oft abjestimmt.");
    store.answerUsage.mockResolvedValue(true);
    await alert.find("button").trigger("click");
    await flushPromises();
    expect(store.answerUsage).toHaveBeenLastCalledWith(7, "say", true);
  });
});
