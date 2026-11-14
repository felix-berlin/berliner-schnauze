import BonCard from "@components/games/BonCard.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock("@utils/analytics", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  trackContentImpressionsWithinNode: mockTrack,
}));

const base = { cardInStack: 4, locked: false, showSwipeHint: false, stack: 2, word: "Schnauze" };
const WIDTH = 400;

function card(props: Partial<typeof base> = {}) {
  const wrapper = mount(BonCard, { props: { ...base, ...props } });
  const el = wrapper.find("section").element as HTMLElement;
  el.getBoundingClientRect = () => ({ width: WIDTH }) as DOMRect;
  return wrapper;
}

// jsdom has no PointerEvent, so a MouseEvent under the pointer event name stands in.
function fire(target: { element: Element }, type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX });
  Object.assign(event, { pointerId: 1 });
  target.element.dispatchEvent(event);
}

/** Drags the card by dx px, taking `ms` milliseconds, and releases it. */
async function drag(wrapper: ReturnType<typeof card>, dx: number, ms: number) {
  const target = wrapper.find("section");
  fire(target, "pointerdown", 200);
  vi.advanceTimersByTime(ms);
  fire(target, "pointermove", 200 + dx);
  fire(target, "pointerup", 200 + dx);
}

describe("BonCard.vue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the word as h2, the label and the progress", () => {
    const wrapper = card();
    expect(wrapper.find("h2").text()).toBe("Schnauze");
    expect(wrapper.text()).toContain("Berlinerisch oder nich?");
    expect(wrapper.text()).toContain("Karte 4 von 20 · Stapel 2");
  });

  it("the feedback slot takes the card's place, wrapped in [data-slot]; the answers stay", () => {
    const wrapper = mount(BonCard, {
      props: base,
      slots: { feedback: "<p class='fb'>Richtig!</p>" },
    });
    expect(wrapper.find("section").exists()).toBe(false);
    expect(wrapper.find(".c-bon-card > [data-slot] > .fb").text()).toBe("Richtig!");
    expect(wrapper.findAll(".c-choice")).toHaveLength(2);
    expect(wrapper.text()).not.toContain("Jeht ooch");
  });

  it("has two answer buttons with shortcuts and emits on click", async () => {
    const wrapper = card();
    const [nee, ja] = wrapper.findAll("button");
    expect(nee.text()).toContain("Nee, nich Berlinerisch");
    expect(nee.attributes("aria-keyshortcuts")).toBe("ArrowLeft");
    expect(ja.text()).toContain("Ja, Berlinerisch");
    expect(ja.attributes("aria-keyshortcuts")).toBe("ArrowRight");
    await nee.trigger("click");
    await ja.trigger("click");
    expect(wrapper.emitted("answer")).toEqual([[false], [true]]);
  });

  it("explains swipe and keys once each, and offers to end the game", () => {
    const wrapper = card();
    expect(wrapper.text()).toContain("Jeht ooch mit Wischen.");
    expect(wrapper.text()).toContain("Jeht ooch mit den Pfeiltasten.");
    expect(wrapper.find("button.c-textlink").text()).toBe("Spiel beenden");
  });

  it("tracks an impression again when the word changes without remounting", async () => {
    const wrapper = card();
    mockTrack.mockClear();
    await wrapper.setProps({ word: "Kiez" });
    await nextTick();
    expect(mockTrack).toHaveBeenCalledOnce();
  });

  it("emits end when the end link is used", async () => {
    const wrapper = card();
    await wrapper.find("button.c-textlink").trigger("click");
    expect(wrapper.emitted("end")).toHaveLength(1);
  });

  it("answers after a drag over 30 % of the width, right = Ja, left = Nee", async () => {
    const wrapper = card();
    await drag(wrapper, WIDTH * 0.3 + 1, 1000);
    await drag(wrapper, -(WIDTH * 0.3 + 1), 1000);
    expect(wrapper.emitted("answer")).toEqual([[true], [false]]);
  });

  it("answers after a fast flick under 30 % (> 0.5 px/ms)", async () => {
    const wrapper = card();
    await drag(wrapper, 60, 100);
    expect(wrapper.emitted("answer")).toEqual([[true]]);
  });

  it("springs back without emitting below the thresholds", async () => {
    const wrapper = card();
    await drag(wrapper, 60, 1000);
    expect(wrapper.emitted("answer")).toBeUndefined();
    expect(wrapper.find<HTMLElement>("section").element.style.transform).toBe("");
  });

  it("rotates with the drag, at most 14 degrees, and shows the overlay", async () => {
    const wrapper = card();
    const target = wrapper.find("section");
    fire(target, "pointerdown", 200);
    fire(target, "pointermove", 600);
    await nextTick();
    expect((target.element as HTMLElement).style.transform).toContain("rotate(14deg)");
    expect(wrapper.find('[data-side="ja"]').attributes("aria-hidden")).toBe("true");
  });

  it("does nothing while locked", async () => {
    const wrapper = card({ locked: true });
    for (const b of wrapper.findAll("button[aria-keyshortcuts]")) await b.trigger("click");
    await drag(wrapper, 300, 100);
    expect(wrapper.emitted("answer")).toBeUndefined();
    expect(wrapper.findAll("button[aria-keyshortcuts]")[0].attributes("aria-disabled")).toBe(
      "true",
    );
  });

  it("renders the swipe hint only when asked, and drops it after 3 s", async () => {
    expect(card().find(".c-bon-card .swipe-hint").exists()).toBe(false);
    const wrapper = card({ showSwipeHint: true });
    expect(wrapper.find(".c-bon-card .swipe-hint").exists()).toBe(true);
    vi.advanceTimersByTime(3100);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".c-bon-card .swipe-hint").exists()).toBe(false);
  });
});
