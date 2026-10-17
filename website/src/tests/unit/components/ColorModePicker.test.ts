import ColorModePicker from "@components/ColorModePicker.vue";
import { $isDarkMode } from "@stores/darkMode.ts";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/darkMode.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stores/darkMode.ts")>();
  return { ...actual, setDarkMode: vi.fn() };
});
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const mountPicker = (props = {}) =>
  mount(ColorModePicker, { props: { source: "Settings", ...props } });

describe("ColorModePicker.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a labelled fieldset with three radios", () => {
    const wrapper = mountPicker();
    expect(wrapper.find("fieldset legend").text()).toBe("Farbschema wählen");
    expect(wrapper.findAll("input[type=radio]")).toHaveLength(3);
    expect(wrapper.text()).toContain("Hell");
    expect(wrapper.text()).toContain("Dunkel");
    expect(wrapper.text()).toContain("System");
  });

  it.each([
    [false, 0],
    [true, 1],
    [null, 2],
  ])("checks the radio matching isDarkMode=%s", (value, index) => {
    $isDarkMode.set(value);
    const radios = mountPicker().findAll<HTMLInputElement>("input[type=radio]");
    radios.forEach((r, i) => expect(r.element.checked).toBe(i === index));
  });

  it.each([
    [0, false, "Light Mode"],
    [1, true, "Dark Mode"],
    [2, null, "System"],
  ])("radio %i sets dark mode %s and tracks %s", async (index, value, action) => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    const { trackEvent } = await import("@utils/analytics");
    $isDarkMode.set(value === null ? true : null); // start unchecked so the click fires change
    await mountPicker({ source: "Main Menu" }).findAll("input[type=radio]")[index].setValue();
    expect(setDarkMode).toHaveBeenCalledWith(value);
    expect(trackEvent).toHaveBeenCalledWith("Color Mode", action, "Main Menu");
  });

  it("hides the text labels and adds titles unless showLabels is set", () => {
    const iconOnly = mountPicker();
    expect(iconOnly.find("label").attributes("title")).toBe("Hell");
    expect(iconOnly.find("label span").classes()).toContain("u-sr-only");

    const labelled = mountPicker({ showLabels: true });
    expect(labelled.find("label").attributes("title")).toBeUndefined();
    expect(labelled.find("label span").classes()).not.toContain("u-sr-only");
  });

  it("names the radio group after its source", () => {
    const menu = mountPicker({ source: "Main Menu" }).find("input").attributes("name");
    const settings = mountPicker().find("input").attributes("name");
    expect(menu).toBe("color-mode-main-menu");
    expect(settings).toBe("color-mode-settings");
  });
});
