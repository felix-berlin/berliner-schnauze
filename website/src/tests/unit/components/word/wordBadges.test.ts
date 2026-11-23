import WordBadges from "@components/word/WordBadges.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { vTooltip } from "@/directives/tooltip";

const trend = { rank: 4, views7: 120 };

const mountBadges = () =>
  mount(WordBadges, {
    attachTo: document.body,
    global: { directives: { tooltip: vTooltip } },
    props: { slug: "testwort", trend },
  });

describe("WordBadges trend tooltip", () => {
  beforeEach(() => {
    HTMLElement.prototype.showPopover = vi.fn();
    HTMLElement.prototype.hidePopover = vi.fn();
  });
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("uses the shared ink tooltip under the badge with the SPEC text", async () => {
    const wrapper = mountBadges();
    const link = wrapper.get("a.trend");
    await link.trigger("pointerenter");
    const panel = document.getElementById(link.attributes("aria-describedby")!)!;
    expect(panel.getAttribute("role")).toBe("tooltip");
    expect(panel.dataset["variant"]).toBe("bottom-start ink");
    expect(panel.textContent).toContain("120 Aufrufe in den letzten 7 Tagen");
  });

  it("keeps the tap behaviour: first tap shows the tooltip, second follows the link", async () => {
    const wrapper = mountBadges();
    const link = wrapper.get("a.trend");
    const tap = () => {
      const e = new MouseEvent("click", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "pointerType", { value: "touch" });
      link.element.dispatchEvent(e);
      return e;
    };
    expect(tap().defaultPrevented).toBe(true);
    expect(HTMLElement.prototype.showPopover).toHaveBeenCalledOnce();
    expect(tap().defaultPrevented).toBe(false);
    expect(HTMLElement.prototype.hidePopover).toHaveBeenCalled();
  });
});
