import SoonButton from "@components/home/SoonButton.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { vTooltip } from "@/directives/tooltip";

describe("SoonButton", () => {
  it("is a focusable, non-submitting button that is announced as disabled and shows its slot", () => {
    const button = mount(SoonButton, {
      global: { directives: { tooltip: vTooltip } },
      slots: { default: "Einsprechen" },
    }).get("button");
    expect(button.text()).toBe("Einsprechen");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-disabled")).toBe("true");
    // aria-disabled, not disabled: the button must stay reachable for the tooltip
    expect(button.attributes("disabled")).toBeUndefined();
  });
});
