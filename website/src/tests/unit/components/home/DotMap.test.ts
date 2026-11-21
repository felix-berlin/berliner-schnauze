import type { Geometry } from "@utils/dotMap.ts";

import DotMap from "@components/home/DotMap.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

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
  viewBox: "0 0 100 100",
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
});
