import type { Geometry } from "@utils/dotMap.ts";

import DotMap from "@components/home/DotMap.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

// All data and geometry invented.
const geometry: Geometry = {
  bezirke: [
    {
      dots: [
        [10, 10, 0],
        [20, 10, 30],
      ],
      name: "Mitte",
      slug: "mitte",
    },
    { dots: [[50, 50, 60]], name: "Pankow", slug: "pankow" },
    { dots: [[80, 80, 90]], name: "Spandau", slug: "spandau" },
  ],
  viewBox: { height: 100, width: 100 },
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

// jsdom's PointerEvent is a plain MouseEvent: set the pointer type by hand.
const move = async (w: ReturnType<typeof mountIt>, pointerType: string, x: number, y: number) => {
  const e = new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  w.get("svg").element.dispatchEvent(e);
  await w.vm.$nextTick();
};

// jsdom has no screen matrix: the client position is taken as viewBox units (identity).
const withScreenMatrix = (w: ReturnType<typeof mountIt>) => {
  vi.stubGlobal(
    "DOMPoint",
    class {
      constructor(
        public x: number,
        public y: number,
      ) {}
      matrixTransform() {
        return { x: this.x, y: this.y };
      }
    },
  );
  Object.defineProperty(w.get("svg").element, "getScreenCTM", {
    value: () => ({ inverse: () => ({}) }),
  });
};

describe("DotMap", () => {
  it("exposes the map as a group of focusable districts in ranking order", () => {
    const w = mountIt();
    expect(w.get("svg").attributes("role")).toBe("group");
    expect(w.findAll("g[tabindex='0']").map((g) => g.attributes("aria-label"))).toEqual([
      "Pankow. 78 Prozent sagen Sag ick selbst",
      "Mitte, typisch: Testwort. 58 Prozent sagen Sag ick selbst",
      "Spandau · noch zu wenig Stimmen",
    ]);
    expect(w.findAll("circle")).toHaveLength(4);
  });

  it("sizes and fades each district from its value, mutes one without", () => {
    const w = mountIt();
    expect(district(w, "Mitte").find("circle").attributes("r")).toBe("2.76");
    expect(district(w, "Mitte").attributes("style")).toContain("--o: 0.59");
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

  it("maps the mouse position to the nearest district and falls back to the focused one", async () => {
    const w = mountIt();
    withScreenMatrix(w);
    await move(w, "mouse", 50, 50);
    expect(w.get(".tip").text()).toBe("Pankow · 78 %");
    await move(w, "touch", 50, 50);
    expect(w.get(".tip").text()).toBe("Pankow · 78 %");

    await district(w, "Mitte").trigger("focus");
    // far from every dot: the focused district stays
    await move(w, "mouse", 95, 5);
    expect(w.get(".tip").text()).toContain("Mitte");
  });

  it("selects the tapped district and keeps the selection for a tap beside the map", async () => {
    const w = mountIt();
    withScreenMatrix(w);
    await w.get("svg").trigger("click", { clientX: 80, clientY: 80 });
    expect(w.get(".tip").text()).toBe("Spandau · noch zu wenig Stimmen");
    await w.get("svg").trigger("click", { clientX: 95, clientY: 5 });
    expect(w.get(".tip").text()).toBe("Spandau · noch zu wenig Stimmen");
  });

  it("ignores hover from a touch and does nothing without a screen matrix", async () => {
    const w = mountIt();
    await district(w, "Pankow").trigger("pointerenter", { pointerType: "touch" });
    expect(w.find(".tip").exists()).toBe(false);
    await move(w, "mouse", 50, 50);
    expect(w.find(".tip").exists()).toBe(false);
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
  });
});
