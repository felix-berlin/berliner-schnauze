import ActiveFilters from "@components/search/ActiveFilters.vue";
import FilterBar from "@components/search/FilterBar.vue";
import FilterGroups from "@components/search/FilterGroups.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installPopover } from "../../helpers/popover";
import { meta, result, state } from "./fixtures";

const facets = result([]).facets;
let uninstall: () => void;

beforeEach(() => (uninstall = installPopover()));
afterEach(() => {
  uninstall();
  document.body.innerHTML = "";
});

const mountBar = (s = state()) =>
  mount(FilterBar, { attachTo: document.body, props: { facets, meta, state: s, total: 12 } });

const chip = (w: ReturnType<typeof mountBar>, name: string) =>
  w.findAll("button[popovertarget]").find((b) => b.text().startsWith(name))!;

describe("FilterBar", () => {
  it("chip shows count pill when active", () => {
    const w = mountBar(state({ pos: ["Verb", "Substantiv"], q: "aal" }));
    expect(chip(w, "Wortart").get("[data-count]").text()).toBe("2");
    expect(chip(w, "Thema").find("[data-count]").exists()).toBe(false);
  });

  it("option toggles apply immediately and Fertig only closes", async () => {
    const w = mountBar();
    const wortart = chip(w, "Wortart");
    await wortart.trigger("click");
    await flushPromises();
    expect(wortart.attributes("aria-expanded")).toBe("true");

    const dialog = w.get(`dialog#${wortart.attributes("popovertarget")}`);
    expect(dialog.attributes("popover")).toBe("auto");
    expect(document.getElementById(dialog.attributes("aria-labelledby")!)?.textContent).toBe(
      "Wortart",
    );
    // Focus goes to the first option.
    const verb = dialog.findAll('[role="checkbox"]').find((b) => b.text().includes("Verb"))!;
    expect(document.activeElement).toBe(dialog.find('[role="checkbox"]').element);

    await verb.trigger("click");
    expect(w.emitted("update")).toEqual([[{ pos: ["Verb"] }]]);
    expect(dialog.text()).toContain("12 Wörter passen");

    const done = dialog.findAll("button").find((b) => b.text() === "Fertig")!;
    expect(done.attributes("popovertargetaction")).toBe("hide");
    await done.trigger("click");
    await flushPromises();
    expect(w.emitted("update")).toHaveLength(1);
    expect(wortart.attributes("aria-expanded")).toBe("false");
  });

  it("Nur Berolinismen has aria-pressed", async () => {
    const w = mountBar(state({ berolinismus: true }));
    const toggle = w.findAll("button").find((b) => b.text() === "Nur Berolinismen")!;
    expect(toggle.attributes("aria-pressed")).toBe("true");
    expect(toggle.attributes("title")).toBe("Nur Berliner Spitznamen für Orte, Straßen und Plätze");
    await toggle.trigger("click");
    expect(w.emitted("update")).toEqual([[{ berolinismus: false }]]);
  });

  it("a crowded bar hides the Sortieren text visually, the select keeps its name", () => {
    const text = (w: ReturnType<typeof mountBar>) =>
      w.findAll("span").find((s) => s.text() === "Sortieren")!;
    expect(text(mountBar(state({ pos: ["Verb"], q: "aal" }))).classes()).not.toContain("u-sr-only");
    const crowded = mountBar(
      state({ berolinismus: true, content: ["audio"], letter: "A", pos: ["Verb"], q: "aal" }),
    );
    expect(text(crowded).classes()).toContain("u-sr-only");
    expect(crowded.find('select[aria-label="Sortieren"]').exists()).toBe(true);
  });

  it("hides the Buchstabe chip in the start state", () => {
    expect(chip(mountBar(), "Buchstabe")).toBeUndefined();
    expect(chip(mountBar(state({ q: "aal" })), "Buchstabe")).toBeDefined();
  });

  it("sort select shows the effective sort and emits the choice", async () => {
    const w = mountBar(state({ q: "aal" }));
    const select = w.get<HTMLSelectElement>('select[aria-label="Sortieren"]');
    expect(select.element.value).toBe("beste");
    await select.setValue("neu");
    expect(w.emitted("update")).toEqual([[{ sort: "neu" }]]);
    expect(mountBar().get<HTMLSelectElement>('select[aria-label="Sortieren"]').element.value).toBe(
      "az",
    );
  });
});

describe("ActiveFilters", () => {
  it("active filter pill removes one value", async () => {
    const w = mount(ActiveFilters, {
      props: { meta, state: state({ berolinismus: true, pos: ["Verb", "Substantiv"] }) },
    });
    expect(w.findAll("button[aria-label^='Filter entfernen']").map((b) => b.text())).toEqual([
      "Wortart: Verb",
      "Wortart: Substantiv",
      "Nur: Berolinismen",
    ]);
    await w.get('button[aria-label="Filter entfernen: Wortart Verb"]').trigger("click");
    expect(w.emitted("update")).toEqual([[{ pos: ["Substantiv"] }]]);
  });
});

describe("FilterGroups", () => {
  it("age options are unter 30 · 30 bis 49 · 50 bis 69 · ab 70", async () => {
    const w = mount(FilterGroups, { props: { facets, group: "gebrauch", meta, state: state() } });
    const age = w.findAll("fieldset").find((f) => f.get("legend").text() === "Altersgruppe")!;
    expect(age.findAll("button").map((b) => b.text())).toEqual([
      "Alle",
      "unter 30",
      "30 bis 49",
      "50 bis 69",
      "ab 70",
    ]);
    await age.findAll("button")[1]!.trigger("click");
    expect(w.emitted("update")).toEqual([[{ age: "u30" }]]);
  });

  it("letter is single choice: a second click clears it", async () => {
    const w = mount(FilterGroups, {
      props: { facets, group: "buchstabe", meta, state: state({ letter: "A" }) },
    });
    const a = w.get('button[aria-pressed="true"]');
    expect(a.text()).toBe("A2");
    await a.trigger("click");
    expect(w.emitted("update")).toEqual([[{ letter: undefined }]]);
  });
});
