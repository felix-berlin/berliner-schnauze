import BonTeaser from "@components/home/BonTeaser.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

// All data invented.
const steps = [
  { from: 0, mult: 1 },
  { from: 4, mult: 2 },
  { from: 8, mult: 4 },
];
const real = {
  isReal: true,
  meaning: "ein erfundenes Testwort",
  slug: "quarkwolke",
  word: "Quarkwolke",
  wrongShare: 62,
};
const fake = { isReal: false, word: "Schnurzelbart", wrongShare: 71 };

type Card = typeof real | typeof fake | null;
const mountIt = (card: Card = real) =>
  mount(BonTeaser, { attachTo: document.body, props: { card, roundsToday: 1234, steps } });
type W = ReturnType<typeof mountIt>;
const button = (w: W, label: string) => w.findAll("button").find((b) => b.text().includes(label));
const status = (w: W) => w.get('[role="status"]').text();

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("BonTeaser", () => {
  it("renders the multiplier bar from steps, the links and today's rounds", () => {
    const w = mountIt();
    const items = w.findAll('[aria-label="Multiplikator"] li').map((li) => li.text());
    expect(items).toEqual(["×1", "ab 4×2", "ab 8×4"]);
    expect(w.get('a[href="/games/berliner-oder-nicht"]').text()).toContain("Jetzt spielen");
    expect(w.get('a[href="/games/berliner-oder-nicht/rangliste"]').text()).toBe(
      "Rangliste dieser Woche",
    );
    expect(w.text()).toContain("1.234 Runden heute jespielt");
  });

  it("drops the stack and the answer buttons without a card, the rest stays", () => {
    const w = mountIt(null);
    expect(w.text()).not.toContain("Is ditt Berlinerisch?");
    expect(button(w, "Nee, erfunden")).toBeUndefined();
    expect(w.text()).toContain("Jetzt spielen");
  });

  it("answers with ArrowRight only while the focus is inside the teaser", async () => {
    const w = mountIt();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    await flushPromises();
    expect(status(w)).toBe("");

    (button(w, "Ja, Berlinerisch")!.element as HTMLElement).focus();
    await w.get("a").trigger("keydown", { key: "ArrowRight" });
    await flushPromises();
    expect(status(w)).toContain("Richtig, ditt is Berlinerisch!");
  });

  it("resolves a real word answered wrong with its meaning and the lookup link", async () => {
    const w = mountIt();
    await button(w, "Nee, erfunden")!.trigger("click");
    await flushPromises();
    expect(status(w)).toContain("Knapp daneben!");
    expect(status(w)).toContain("ein erfundenes Testwort");
    expect(status(w)).toContain("62 % haben hier „erfunden“ jetippt.");
    expect(w.get('a[href="/wort/quarkwolke"]').text()).toBe("Quarkwolke nachschlagen");
    expect(button(w, "Ja, Berlinerisch")).toBeUndefined();

    await button(w, "Nochmal die Probekarte")!.trigger("click");
    expect(status(w)).toBe("");
    expect(button(w, "Ja, Berlinerisch")).toBeDefined();
  });

  it("resolves a fake word without a lookup link", async () => {
    const right = mountIt(fake);
    await button(right, "Nee, erfunden")!.trigger("click");
    await flushPromises();
    expect(status(right)).toContain("Richtig, ditt is erfunden!");
    expect(status(right)).toContain("71 % haben hier „Berlinerisch“ jetippt.");
    expect(status(right)).not.toContain("nachschlagen");
    right.unmount();

    const wrong = mountIt(fake);
    await button(wrong, "Ja, Berlinerisch")!.trigger("click");
    await flushPromises();
    expect(status(wrong)).toContain("Knapp daneben!");
  });

  it("answers a horizontal swipe on the card, ignores a short one", async () => {
    const w = mountIt();
    const card = w.get('[role="status"]').element.previousElementSibling as HTMLElement;
    const swipe = (from: number, to: number) => {
      card.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: from }));
      card.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: to }));
    };
    swipe(100, 130);
    await flushPromises();
    expect(status(w)).toBe("");
    swipe(100, 20);
    await flushPromises();
    expect(status(w)).toContain("Knapp daneben!");
  });

  it("never calls the BON API for the trial card", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const w = mountIt();
    await button(w, "Ja, Berlinerisch")!.trigger("click");
    await flushPromises();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
