import FilterSheet from "@components/search/FilterSheet.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { meta, result, state } from "./fixtures";

const facets = result([]).facets;

// jsdom has no modal dialog: open/close toggle the attribute like a browser.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  Element.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  document.body.innerHTML = "";
});

const mountSheet = (s = state(), total = 12) =>
  mount(FilterSheet, { attachTo: document.body, props: { facets, meta, state: s, total } });

const button = (w: ReturnType<typeof mountSheet>, text: string) =>
  w.findAll("button").find((b) => b.text() === text)!;

describe("FilterSheet", () => {
  it("filter button shows the count pill", () => {
    const opener = (w: ReturnType<typeof mountSheet>) => w.get('button[aria-haspopup="dialog"]');
    expect(opener(mountSheet()).find("[data-count]").exists()).toBe(false);
    const w = mountSheet(state({ berolinismus: true, pos: ["Verb", "Substantiv"] }));
    expect(opener(w).get("[data-count]").text()).toBe("3");
  });

  it("summary shows Alle / Egal / 2 gewählt", () => {
    const w = mountSheet(state({ pos: ["Verb", "Substantiv"], q: "aal" }));
    const summary = (title: string) =>
      w.findAll("summary").find((s) => s.text().startsWith(title))!;
    expect(summary("Wortart").get("[data-summary]").text()).toBe("2 gewählt");
    expect(summary("Thema").get("[data-summary]").text()).toBe("Alle");
    expect(summary("Gebrauch").get("[data-summary]").text()).toBe("Egal");
    // One value from a single-choice field shows its label, without the bracket.
    const one = mountSheet(state({ often: "oft", q: "aal" }));
    const gebrauch = one.findAll("summary").find((s) => s.text().startsWith("Gebrauch"))!;
    expect(gebrauch.get("[data-summary]").text()).toBe("Oft");
    // Only „Gebrauch“ starts open, and the items are not exclusive.
    const open = w.findAll("details").filter((d) => d.attributes("open") !== undefined);
    expect(open.map((d) => d.get("summary").text())).toEqual([expect.stringMatching(/^Gebrauch/)]);
    expect(w.findAll("details[name]")).toHaveLength(0);
  });

  it("{n} Wörter zeigen closes and keeps filters", async () => {
    const w = mountSheet(state({ pos: ["Verb"] }));
    const dialog = w.get("dialog");
    expect(dialog.attributes("closedby")).toBe("any");
    expect(dialog.attributes("role")).toBeUndefined();
    expect(dialog.attributes("aria-modal")).toBeUndefined();
    expect(document.getElementById(dialog.attributes("aria-labelledby")!)?.textContent).toBe(
      "Filter",
    );

    await w.get('button[aria-haspopup="dialog"]').trigger("click");
    expect(dialog.attributes("open")).toBeDefined();

    await button(w, "12 Wörter zeigen").trigger("click");
    expect(dialog.attributes("open")).toBeUndefined();
    expect(w.emitted("update")).toBeUndefined();
    expect(w.emitted("reset")).toBeUndefined();
  });

  it("says 1 Wort zeigen and Zurücksetzen asks for a reset", async () => {
    const w = mountSheet(state({ pos: ["Verb"] }), 1);
    expect(button(w, "1 Wort zeigen").exists()).toBe(true);
    await button(w, "Zurücksetzen").trigger("click");
    expect(w.emitted("reset")).toHaveLength(1);
  });

  it("Nur Berolinismen is a switch", async () => {
    const w = mountSheet(state({ berolinismus: true }));
    const toggle = w.get('[role="switch"]');
    expect(toggle.attributes("aria-checked")).toBe("true");
    await toggle.trigger("click");
    expect(w.emitted("update")).toEqual([[{ berolinismus: false }]]);
  });

  it("dragging the grip down far enough closes, a short pull does not", async () => {
    const w = mountSheet();
    const dialog = w.get("dialog");
    const grip = w.get("[data-grip]");
    await w.get('button[aria-haspopup="dialog"]').trigger("click");

    const pull = async (dy: number) => {
      await grip.trigger("pointerdown", { clientY: 100, pointerId: 1 });
      await grip.trigger("pointermove", { clientY: 100 + dy, pointerId: 1 });
      await grip.trigger("pointerup", { clientY: 100 + dy, pointerId: 1 });
    };
    await pull(20);
    expect(dialog.attributes("open")).toBeDefined();
    await pull(200);
    expect(dialog.attributes("open")).toBeUndefined();
  });
});
