import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

import BerlinerBaer from "@/components/kalle/BerlinerBaer.vue";

const tok = (w: { attributes: (n: string) => string | undefined }, a: string) =>
  (w.attributes(a) ?? "").split(" ");

describe("BerlinerBaer", () => {
  it("renders the mood as a state token", () => {
    const w = mount(BerlinerBaer, { props: { mood: "wave" } });
    expect(tok(w, "data-state")).toContain("wave");
  });

  it("is decorative without a label and an image with one", () => {
    const decorative = mount(BerlinerBaer);
    expect(decorative.find("svg").attributes("aria-hidden")).toBe("true");
    const image = mount(BerlinerBaer, { props: { label: "Kalle winkt" } });
    expect(image.find("svg").attributes("role")).toBe("img");
    expect(image.find("svg").attributes("aria-label")).toBe("Kalle winkt");
  });

  it("shows brows from 200px", () => {
    expect(tok(mount(BerlinerBaer, { props: { size: 199 } }), "data-variant")).not.toContain(
      "brows",
    );
    expect(tok(mount(BerlinerBaer, { props: { size: 200 } }), "data-variant")).toContain("brows");
  });

  it("sets the a11y attributes on the head and the peek variant too", () => {
    for (const variant of ["head", "peek"] as const) {
      const decorative = mount(BerlinerBaer, { props: { variant } }).find("svg");
      expect(decorative.attributes("aria-hidden")).toBe("true");
      const image = mount(BerlinerBaer, { props: { label: "Kalle", variant } }).find("svg");
      expect(image.attributes("role")).toBe("img");
      expect(image.attributes("aria-label")).toBe("Kalle");
    }
  });

  it("switches to the head below 64px and to the simplified version below 96px", () => {
    const small = mount(BerlinerBaer, { props: { size: 48 } });
    expect(tok(small, "data-variant")).toEqual(expect.arrayContaining(["head", "small"]));
    expect(small.find("mask").exists()).toBe(false);
    expect(tok(mount(BerlinerBaer, { props: { size: 80 } }), "data-variant")).toContain("small");
  });

  it("is calm by default below 200px", () => {
    expect(tok(mount(BerlinerBaer, { props: { size: 120 } }), "data-variant")).toContain("calm");
    expect(tok(mount(BerlinerBaer, { props: { size: 300 } }), "data-variant")).not.toContain(
      "calm",
    );
    expect(
      tok(mount(BerlinerBaer, { props: { calm: true, size: 300 } }), "data-variant"),
    ).toContain("calm");
  });

  it("assigns page-wide unique mask ids after mounting", async () => {
    const a = mount(BerlinerBaer);
    const b = mount(BerlinerBaer);
    await a.vm.$nextTick();
    await b.vm.$nextTick();
    const idA = a.find("mask").attributes("id");
    const idB = b.find("mask").attributes("id");
    expect(idA).toMatch(/^bv-\d+-m$/);
    expect(idA).not.toBe(idB);
    expect(a.find(`[mask="url(#${idA})"]`).exists()).toBe(true);
  });

  it("needs no id for the peek variant", () => {
    const w = mount(BerlinerBaer, { props: { variant: "peek" } });
    expect(w.find("clipPath").exists()).toBe(false);
    expect(w.findAll("svg").length).toBe(3); // outer + two clip windows
  });

  it("springs on every mood change", async () => {
    const w = mount(BerlinerBaer, { props: { mood: "idle" } });
    expect(tok(w, "data-state")).not.toContain("sw-a");
    await w.setProps({ mood: "nod" });
    expect(tok(w, "data-state")).toContain("sw-a");
    await w.setProps({ mood: "shake" });
    expect(tok(w, "data-state")).toContain("sw-b");
  });

  it("flinches on tap, roars on the third tap and returns", async () => {
    vi.useFakeTimers();
    const w = mount(BerlinerBaer, { props: { mood: "dance", tappable: true } });
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("flinch-a");
    expect(tok(w, "data-state")).toContain("dance");
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("flinch-b");
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("roar");
    vi.advanceTimersByTime(2000);
    await w.vm.$nextTick();
    expect(tok(w, "data-state")).toContain("dance");
    vi.useRealTimers();
  });

  it("ignores clicks when not tappable", async () => {
    const w = mount(BerlinerBaer);
    await w.trigger("click");
    expect(tok(w, "data-state").some((c) => c.startsWith("flinch"))).toBe(false);
  });

  it("twitches the ears through keystroke()", async () => {
    const w = mount(BerlinerBaer);
    (w.vm as unknown as { keystroke: () => void }).keystroke();
    await w.vm.$nextTick();
    expect(tok(w, "data-state")).toContain("type-a");
  });

  it("reports the end of enter and exit", async () => {
    vi.useFakeTimers();
    const w = mount(BerlinerBaer, { props: { mood: "idle" } });
    await w.setProps({ mood: "enter" });
    vi.advanceTimersByTime(900);
    expect(w.emitted("done")?.[0]).toEqual(["enter"]);
    await w.setProps({ mood: "exit" });
    vi.advanceTimersByTime(2000);
    expect(w.emitted("done")?.[1]).toEqual(["exit"]);
    vi.useRealTimers();
  });

  it("clamps the gaze to -1..1", () => {
    const w = mount(BerlinerBaer, { props: { gazeX: 3, gazeY: -2, mood: "follow" } });
    const style = w.attributes("style") ?? "";
    expect(style).toContain("--_lx: 1");
    expect(style).toContain("--_ly: -1");
  });
});
