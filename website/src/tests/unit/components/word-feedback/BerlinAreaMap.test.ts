import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const mountMap = (modelValue: string | null = null) =>
  mount(BerlinAreaMap, { attachTo: document.body, props: { modelValue: modelValue as never } });

describe("BerlinAreaMap", () => {
  it("renders 14 Berlin areas, Brandenburg and a Woanders button in one radiogroup", () => {
    const w = mountMap();
    expect(w.find('[role="radiogroup"]').attributes("aria-label")).toBe("Wo wohnste?");
    const radios = w.findAll('[role="radio"]');
    expect(radios).toHaveLength(15);
    expect(radios.filter((r) => r.attributes("aria-label") === "Brandenburg")).toHaveLength(1);
    expect(w.find('[aria-label="Wedding/Tiergarten"]').exists()).toBe(true);
    expect(w.find("button").text()).toBe("Woanders");
    w.unmount();
  });

  it("emits the key when an area is clicked", async () => {
    const w = mountMap();
    await w.find('[aria-label="Kreuzberg"]').trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["kreuzberg"]);
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
});
