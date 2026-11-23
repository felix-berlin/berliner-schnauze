// @vitest-environment jsdom
import { wireRecordTooltips } from "@components/word/recordTooltips.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PAGE = `<div class="c-word-beispiele"><span class="record"><button class="record-button" aria-disabled="true" aria-describedby="fb" data-tip-lead="Kommt bald." data-tip="Noch nich.">Einsprechen</button><span class="u-sr-only" id="fb" role="tooltip">Kommt bald. Noch nich.</span></span></div>`;
const fire = (name: string) => document.dispatchEvent(new Event(name));
const panels = () => document.querySelectorAll("[popover]").length;

describe("wireRecordTooltips (ClientRouter wiring)", () => {
  let stop: () => void;
  beforeEach(() => {
    HTMLElement.prototype.showPopover = vi.fn();
    HTMLElement.prototype.hidePopover = vi.fn();
    document.body.innerHTML = PAGE;
    stop = wireRecordTooltips();
  });
  afterEach(() => {
    stop();
    document.body.innerHTML = "";
  });

  const button = () => document.querySelector<HTMLElement>(".record-button")!;
  const describedBy = () => button().getAttribute("aria-describedby");

  it("attaches on page-load, replaces the server description and shows the bold lead-in", () => {
    expect(describedBy()).toBe("fb"); // before the script: the server description
    fire("astro:page-load");
    expect(document.getElementById("fb")).toBeNull();
    button().dispatchEvent(new Event("focusin"));
    const panel = document.getElementById(describedBy()!)!;
    expect(panel.querySelector("b")?.textContent).toBe("Kommt bald.");
    expect(panel.textContent).toBe("Kommt bald. Noch nich.");
  });

  it("re-initialises on a repeated page-load without leaking a panel", () => {
    fire("astro:page-load");
    fire("astro:page-load");
    expect(describedBy()).toMatch(/^tooltip-/);
    button().dispatchEvent(new Event("focusin"));
    expect(panels()).toBe(1);
  });

  it("detaches before the swap and attaches the new page afterwards (navigate, back)", () => {
    fire("astro:page-load");
    button().dispatchEvent(new Event("focusin"));
    fire("astro:before-swap");
    expect(button().hasAttribute("aria-describedby")).toBe(false);
    expect(panels()).toBe(0);
    document.body.innerHTML = PAGE; // the swapped-in page (back navigation)
    fire("astro:page-load");
    expect(describedBy()).toMatch(/^tooltip-/);
    button().dispatchEvent(new Event("focusin"));
    expect(panels()).toBe(1);
  });

  it("removes its listeners on cleanup", () => {
    stop();
    fire("astro:page-load");
    expect(describedBy()).toBe("fb");
  });
});
