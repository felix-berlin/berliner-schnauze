import ResultsBand from "@components/home/ResultsBand.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

// All data invented.
const names = ["Mitte", "Pankow", "Spandau", "Lichtenberg", "Neukölln", "Reinickendorf"];
const values = [58, 78, 34, 81, null, 45];
const districts = names.map((name, i) => ({
  area: name.toLowerCase(),
  name,
  typical: null,
  value: values[i]!,
}));
const word = (n: number, byGroup: Record<"u30" | "30-49" | "50-69" | "70plus", number | null>) => ({
  byGroup,
  word: { berlinerisch: `Testwort ${n}`, slug: `testwort-${n}` },
});
const ageLists = {
  dying: [word(1, { "30-49": 8, "50-69": 22, "70plus": 67, u30: 3 })],
  growing: [word(2, { "30-49": 31, "50-69": 14, "70plus": 7, u30: 48 })],
};
const noValues = districts.map((d) => ({ ...d, value: null }));
type Props = InstanceType<typeof ResultsBand>["$props"];
const mountIt = (props: Partial<Props> = {}) =>
  mount(ResultsBand, { attachTo: document.body, props: { ageLists, districts, ...props } });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ResultsBand", () => {
  it("is a dark band with both tabs, the district panel first", () => {
    const w = mountIt();
    expect(w.get(".c-home-results").attributes("data-theme")).toBe("dark");
    expect(w.get("h2").text()).toBe("Wo wird noch berlinert?");
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Nach Bezirk", "Nach Alter"]);
    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    expect(panels[0]!.attributes("hidden")).toBeUndefined();
    expect(panels[1]!.attributes()).toHaveProperty("hidden");
  });

  it("ranks the top three and the bottom two districts with a value", () => {
    const w = mountIt();
    const lists = w.findAll('[role="tabpanel"]')[0]!.findAll("ul");
    const rows = (i: number) =>
      lists[i]!.findAll("li").map((li) => `${li.get("span").text()} ${li.get("b").text()}`);
    expect(rows(0)).toEqual(["Lichtenberg 81 %", "Pankow 78 %", "Mitte 58 %"]);
    expect(rows(1)).toEqual(["Reinickendorf 45 %", "Spandau 34 %"]);
  });

  it("lists the age words with their profile and the 70+ / under-30 highlight", () => {
    const w = mountIt();
    const panel = w.findAll('[role="tabpanel"]')[1]!;
    expect(panel.findAll("h3").map((h) => h.text())).toEqual([
      "Stirbt langsam aus",
      "Lebt und wächst",
    ]);
    expect(panel.get('a[href="/wort/testwort-1"]').text()).toContain("Testwort 1");
    expect(panel.findAll('[role="img"]').map((i) => i.attributes("data-variant"))).toEqual([
      "dying",
      "growing",
    ]);
    expect(panel.text()).toContain("unter 30 · 30–49 · 50–69 · 70+ · nur Gruppen ab 10 Stimmen");
  });

  it("switches tabs with the arrow keys, roving tabindex", async () => {
    const w = mountIt();
    const tabs = () => w.findAll('[role="tab"]');
    expect(tabs().map((t) => t.attributes("tabindex"))).toEqual(["0", "-1"]);
    await tabs()[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(tabs().map((t) => t.attributes("aria-selected"))).toEqual(["false", "true"]);
    expect(tabs().map((t) => t.attributes("tabindex"))).toEqual(["-1", "0"]);
    expect(document.activeElement).toBe(tabs()[1]!.element);
    expect(w.findAll('[role="tabpanel"]')[0]!.attributes()).toHaveProperty("hidden");
    await tabs()[1]!.trigger("keydown", { key: "ArrowLeft" });
    expect(tabs()[0]!.attributes("aria-selected")).toBe("true");
    await tabs()[0]!.trigger("keydown", { key: "End" });
    expect(tabs()[1]!.attributes("aria-selected")).toBe("true");
  });

  it("hides a tab without data", () => {
    const noDistricts = mountIt({ districts: noValues });
    expect(noDistricts.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Nach Alter"]);
    expect(noDistricts.findAll('[role="tabpanel"]')).toHaveLength(1);
    expect(noDistricts.find("svg").exists()).toBe(false);

    const noAges = mountIt({ ageLists: { dying: [], growing: [] } });
    expect(noAges.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Nach Bezirk"]);
  });

  it("drops an empty age list but keeps the other", () => {
    const w = mountIt({ ageLists: { dying: [], growing: ageLists.growing } });
    expect(w.findAll("h3").map((h) => h.text())).toEqual(["Lebt und wächst"]);
  });

  it("renders nothing when both tabs are empty", () => {
    const w = mountIt({ ageLists: { dying: [], growing: [] }, districts: noValues });
    expect(w.find(".c-home-results").exists()).toBe(false);
    expect(w.text()).toBe("");
  });
});
