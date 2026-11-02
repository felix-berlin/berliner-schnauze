import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const mountMap = (modelValue: string | null = null) =>
  mount(BerlinAreaMap, { attachTo: document.body, props: { modelValue: modelValue as never } });

describe("BerlinAreaMap", () => {
  it("renders the 12 Bezirke, Brandenburg and a Woanders button in one radiogroup", () => {
    const w = mountMap();
    expect(w.find('[role="radiogroup"]').attributes("aria-label")).toBe("Wo wohnste?");
    const radios = w.findAll('[role="radio"]');
    expect(radios).toHaveLength(13);
    expect(radios.filter((r) => r.attributes("aria-label") === "Brandenburg")).toHaveLength(1);
    expect(w.find('[aria-label="Friedrichshain-Kreuzberg"]').exists()).toBe(true);
    expect(w.find('[aria-label="Wedding/Tiergarten"]').exists()).toBe(false);
    expect(w.find("button").text()).toBe("Woanders");
    w.unmount();
  });

  it("emits the key when an area is clicked", async () => {
    const w = mountMap();
    await w.find('[aria-label="Friedrichshain-Kreuzberg"]').trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["friedrichshain-kreuzberg"]);
    w.unmount();
  });

  it("emits elsewhere from the Woanders button", async () => {
    const w = mountMap();
    await w.find("button").trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["elsewhere"]);
    w.unmount();
  });

  it("marks the selected area as checked", () => {
    const w = mountMap("pankow");
    expect(w.find('[aria-label="Pankow"]').attributes("aria-checked")).toBe("true");
    expect(w.findAll('[aria-checked="true"]')).toHaveLength(1);
    w.unmount();
  });

  it("moves focus with ArrowRight and selects with Enter", async () => {
    const w = mountMap("pankow");
    const radios = w.findAll('[role="radio"]');
    const i = radios.findIndex((r) => r.attributes("aria-checked") === "true");
    (radios[i].element as SVGElement).focus();
    await radios[i].trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[i + 1].element);
    await radios[i + 1].trigger("keydown", { key: "Enter" });
    expect(w.emitted("update:modelValue")![0]).toEqual([radios[i + 1].attributes("data-area")]);
    w.unmount();
  });

  it("wraps ArrowRight from the last radio to the first and ArrowLeft back", async () => {
    const w = mountMap();
    const radios = w.findAll('[role="radio"]');
    const last = radios.length - 1;
    (radios[last].element as SVGElement).focus();
    await radios[last].trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[0].element);
    await radios[0].trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radios[last].element);
    w.unmount();
  });

  it.each([null, "pankow", "elsewhere"])("has exactly one tab stop for modelValue %s", (value) => {
    const w = mountMap(value);
    expect(w.findAll('[role="radio"][tabindex="0"]')).toHaveLength(1);
    w.unmount();
  });

  it("selects with Space and emits once per key press", async () => {
    const w = mountMap();
    await w.find('[aria-label="Spandau"]').trigger("keydown", { key: " " });
    expect(w.emitted("update:modelValue")).toEqual([["spandau"]]);
    w.unmount();
  });

  it("marks the Brandenburg label selected with the frame", () => {
    const w = mountMap("brandenburg");
    expect(w.find(".c-berlin-area-map__label--brandenburg").classes()).toContain("is-selected");
    w.unmount();
  });

  it("emits the area from the list buttons", async () => {
    const w = mount(BerlinAreaMap, { props: { modelValue: null } });
    const btn = w
      .findAll(".c-berlin-area-map__list-item")
      .find((b) => b.text() === "Friedrichshain-Kreuzberg");
    await btn!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["friedrichshain-kreuzberg"]);
  });

  it("offers Woanders in the list too, with the same emit contract", async () => {
    const w = mount(BerlinAreaMap, { props: { modelValue: null } });
    const items = w.findAll(".c-berlin-area-map__list-item");
    expect(items).toHaveLength(14);
    await items.find((b) => b.text() === "Woanders")!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["elsewhere"]);
  });

  it("shows the full district names, broken over two lines where they are long", () => {
    const w = mountMap();
    const lines = w.findAll("text.c-berlin-area-map__label tspan").map((t) => t.text());
    expect(lines).toContain("Reinickendorf");
    expect(lines).toEqual(expect.arrayContaining(["Charlottenburg-", "Wilmersdorf"]));
    w.unmount();
  });

  it("starts map first without a measured width", () => {
    const w = mountMap();
    expect((w.find(".c-berlin-area-map__map").element as HTMLDetailsElement).open).toBe(true);
    expect((w.find(".c-berlin-area-map__list").element as HTMLDetailsElement).open).toBe(false);
    w.unmount();
  });
});
