import type { Geometry } from "@utils/dotMap.ts";

import DotMap from "@components/home/DotMap.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

// All data and geometry invented.
const geometry: Geometry = {
  bezirke: [
    {
      bottom: 10,
      name: "Mitte",
      path: "M10 10h0M20 10h0",
      slug: "mitte",
      top: 10,
      x: 15,
    },
    { bottom: 50, name: "Pankow", path: "M50 50h0", slug: "pankow", top: 50, x: 50 },
    { bottom: 80, name: "Spandau", path: "M80 80h0", slug: "spandau", top: 80, x: 80 },
  ],
  viewBox: { height: 100, width: 100 },
  wave: { reach: 70, x: 50, y: 40 },
};
const districts = [
  {
    area: "mitte",
    name: "Mitte",
    typical: { berlinerisch: "Testwort", slug: "testwort" },
    value: 58,
  },
  { area: "pankow", name: "Pankow", typical: null, value: 78 },
  { area: "spandau", name: "Spandau", typical: null, value: null },
];
const mountIt = () => mount(DotMap, { attachTo: document.body, props: { districts, geometry } });
const district = (w: ReturnType<typeof mountIt>, name: string) =>
  w.findAll("g[tabindex]").find((g) => g.attributes("aria-label")!.startsWith(name))!;

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("DotMap", () => {
  it("exposes the map as a group of focusable districts in ranking order", () => {
    const w = mountIt();
    expect(w.get("svg").attributes("role")).toBe("group");
    expect(w.findAll("g[tabindex='0']").map((g) => g.attributes("aria-label"))).toEqual([
      "Pankow. 78 Prozent sagen Sag ick selbst",
      "Mitte, typisch: Testwort. 58 Prozent sagen Sag ick selbst",
      "Spandau · noch zu wenig Stimmen",
    ]);
    // One path per district; the focus ring and the hit area reuse it.
    expect(w.findAll("path")).toHaveLength(3);
    const mitte = district(w, "Mitte");
    const id = mitte.get("path").attributes("id");
    expect(mitte.get("path").attributes("d")).toBe("M10 10h0M20 10h0");
    expect(mitte.findAll("use").map((u) => u.attributes("href"))).toEqual([`#${id}`, `#${id}`]);
  });

  it("sizes and fades each district from its value, mutes one without", () => {
    const w = mountIt();
    expect(district(w, "Mitte").attributes("style")).toContain("--o: 0.59");
    expect(district(w, "Mitte").attributes("style")).toContain("--r: 2.76");
    expect(district(w, "Spandau").attributes("data-value")).toBe("none");
  });

  it("shows the tooltip on focus, hides it on Escape and blur", async () => {
    const w = mountIt();
    expect(w.find('[aria-hidden="true"].tip').exists()).toBe(false);
    await district(w, "Mitte").trigger("focus");
    const tip = w.get(".tip");
    expect(tip.text()).toContain("Mitte · 58 %");
    expect(tip.text()).toContain("Typisch: Testwort");
    expect(district(w, "Mitte").attributes("data-state")).toBe("active");

    await district(w, "Mitte").trigger("keydown", { key: "Escape" });
    expect(w.find(".tip").exists()).toBe(false);

    await district(w, "Spandau").trigger("click");
    expect(w.get(".tip").text()).toBe("Spandau · noch zu wenig Stimmen");
    await district(w, "Spandau").trigger("blur");
    expect(w.find(".tip").exists()).toBe(false);
  });

  it("shows the tooltip while a mouse hovers a district", async () => {
    const w = mountIt();
    await district(w, "Pankow").trigger("pointerenter", { pointerType: "mouse" });
    expect(w.get(".tip").text()).toBe("Pankow · 78 %");
    await district(w, "Pankow").trigger("pointerleave", { pointerType: "mouse" });
    expect(w.find(".tip").exists()).toBe(false);
  });

  it("ignores hover from a touch and falls back to the focused district", async () => {
    const w = mountIt();
    await district(w, "Pankow").trigger("pointerenter", { pointerType: "touch" });
    expect(w.find(".tip").exists()).toBe(false);
    await district(w, "Mitte").trigger("focus");
    await district(w, "Pankow").trigger("pointerenter", { pointerType: "pen" });
    expect(w.get(".tip").text()).toBe("Pankow · 78 %");
    await district(w, "Pankow").trigger("pointerleave", { pointerType: "pen" });
    expect(w.get(".tip").text()).toContain("Mitte");
  });

  it("hands the wave its centre and reach in viewBox units", () => {
    const style = mountIt().get("svg").attributes("style");
    expect(style).toContain("--map-w: 100");
    expect(style).toContain("--wave-x: 50%");
    expect(style).toContain("--wave-y: 40%");
    expect(style).toContain("--wave-reach: 70");
  });

  it("puts the tooltip below a district in the top quarter and above the others", async () => {
    const w = mountIt();
    await district(w, "Mitte").trigger("focus");
    expect(w.get(".tip").attributes("data-side")).toBe("below");
    await district(w, "Pankow").trigger("focus");
    expect(w.get(".tip").attributes("data-side")).toBeUndefined();
  });

  it("stands still without IntersectionObserver and runs the wave once when visible", async () => {
    expect(mountIt().get(".map").attributes("data-wave")).toBeUndefined();

    let notify: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof notify) {
          notify = callback;
        }
        observe() {}
        unobserve() {}
        takeRecords = () => [];
        disconnect = disconnect;
      },
    );
    const w = mountIt();
    await w.vm.$nextTick();
    expect(w.get(".map").attributes("data-wave")).toBe("ready");
    notify([{ isIntersecting: false }]);
    await w.vm.$nextTick();
    expect(w.get(".map").attributes("data-wave")).toBe("ready");
    notify([{ isIntersecting: true }]);
    await w.vm.$nextTick();
    expect(w.get(".map").attributes("data-wave")).toBe("in");
    expect(disconnect).toHaveBeenCalled();
    // The end of a district's own transition is not the wave's end: only the svg's animation drops the mask.
    await district(w, "Mitte").trigger("animationend");
    expect(w.get(".map").attributes("data-wave")).toBe("in");
    await w.get("svg").trigger("animationend");
    expect(w.get(".map").attributes("data-wave")).toBe("done");
  });
});
