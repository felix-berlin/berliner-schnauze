import QuickSearch from "@components/search/QuickSearch.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const mocks = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: mocks.trackEvent }));

// The panel (index, model, rows) has its own test; here it is a field, a button and the open prop.
vi.mock("@components/search/QuickSearchPanel.vue", () => ({
  [Symbol.toStringTag]: "Module",
  default: defineComponent({
    emits: ["close"],
    props: { open: Boolean, wide: Boolean },
    setup:
      (props, { emit }) =>
      () =>
        h("div", { class: "box", "data-open": String(props.open) }, [
          h("input", { "aria-label": "feld" }),
          h("button", { onClick: () => emit("close") }, "esc"),
          h("a", { href: "/wort" }, "Alle Wörter A–Z"),
        ]),
  }),
}));

// jsdom has no modal dialog: open/close toggle the attribute and fire `close` like a browser.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

const mountIsland = () => mount(QuickSearch, { attachTo: document.body });
type W = ReturnType<typeof mountIsland>;
const dialog = (w: W) => w.get("dialog").element as HTMLDialogElement;
const trigger = (w: W) => w.get('button[aria-label="Suche aktivieren"]');
const press = (init: KeyboardEventInit, target: EventTarget = document.body) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};

describe("QuickSearch dialog shell (SPEC §19, §20)", () => {
  it("the header button opens the dialog, named Schnellsuche, with the panel", async () => {
    const w = mountIsland();
    expect(dialog(w).getAttribute("aria-label")).toBe("Schnellsuche");
    expect(w.find(".box").exists()).toBe(false); // loaded on first open only

    await trigger(w).trigger("click");
    await flushPromises();
    expect(dialog(w).open).toBe(true);
    expect(w.get(".box").attributes("data-open")).toBe("true");
  });

  it("/ and Ctrl/⌘+K open it and are tracked; / in a field does not", async () => {
    const w = mountIsland();
    const input = document.createElement("input");
    document.body.append(input);
    expect(press({ key: "/" }, input).defaultPrevented).toBe(false);
    expect(dialog(w).open).toBe(false);

    expect(press({ key: "/" }).defaultPrevented).toBe(true);
    expect(dialog(w).open).toBe(true);
    dialog(w).close();
    expect(press({ ctrlKey: true, key: "k" }, input).defaultPrevented).toBe(true);
    expect(dialog(w).open).toBe(true);
    dialog(w).close();
    press({ key: "K", metaKey: true });
    expect(dialog(w).open).toBe(true);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "Search",
      "Open Search Modal via Keyboard",
      "Search Modal Opened via Keyboard",
    );
    w.unmount();
  });

  it("a page that takes / for its own field (the search page) keeps the dialog closed", () => {
    const w = mountIsland();
    // SearchApp/HomeSearch: window capture listener that stops the event.
    const own = (e: KeyboardEvent) => e.key === "/" && e.stopPropagation();
    window.addEventListener("keydown", own, { capture: true });
    press({ key: "/" });
    window.removeEventListener("keydown", own, { capture: true });
    expect(dialog(w).open).toBe(false);
  });

  it("closing returns focus to the trigger", async () => {
    const w = mountIsland();
    (trigger(w).element as HTMLButtonElement).focus();
    await trigger(w).trigger("click");
    await flushPromises();
    w.get(".box input").element.focus();

    await w.get(".box button").trigger("click");
    expect(dialog(w).open).toBe(false);
    expect(document.activeElement).toBe(trigger(w).element);
    expect(w.get(".box").attributes("data-open")).toBe("false");
  });

  it("Tab stays inside: last → first, Shift+Tab first → last", async () => {
    const w = mountIsland();
    await trigger(w).trigger("click");
    await flushPromises();
    const input = w.get(".box input").element as HTMLInputElement;
    const link = w.get(".box a").element as HTMLAnchorElement;

    link.focus();
    expect(press({ key: "Tab" }, link).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(press({ key: "Tab", shiftKey: true }, input).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(link);
  });

  it("a press on the scrim closes, a press in the box does not", async () => {
    const w = mountIsland();
    await trigger(w).trigger("click");
    await flushPromises();

    await w.get(".box").trigger("pointerdown");
    await w.get(".box").trigger("click");
    expect(dialog(w).open).toBe(true);
    await w.get("dialog").trigger("pointerdown");
    await w.get("dialog").trigger("click");
    expect(dialog(w).open).toBe(false);
  });

  it("closes when a navigation swaps the page", async () => {
    const w = mountIsland();
    await trigger(w).trigger("click");
    document.dispatchEvent(new Event("astro:before-swap"));
    expect(dialog(w).open).toBe(false);
  });
});
