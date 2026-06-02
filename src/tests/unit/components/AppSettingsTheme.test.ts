import AppSettingsTheme from "@components/AppSettingsTheme.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/darkMode.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stores/darkMode.ts")>();
  return { ...actual, setDarkMode: vi.fn() };
});
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

describe("AppSettingsTheme.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders three theme buttons", () => {
    const wrapper = mount(AppSettingsTheme);
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders System, Hell, Dunkel labels", () => {
    const wrapper = mount(AppSettingsTheme);
    const text = wrapper.text();
    expect(text).toContain("System");
    expect(text).toContain("Hell");
    expect(text).toContain("Dunkel");
  });

  it("marks System button active when isDarkMode is null", async () => {
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(null);
    const wrapper = mount(AppSettingsTheme);
    const buttons = wrapper.findAll("button");
    expect(buttons[0].classes()).toContain("is-active");
    expect(buttons[1].classes()).not.toContain("is-active");
    expect(buttons[2].classes()).not.toContain("is-active");
  });

  it("marks Hell button active when isDarkMode is false", async () => {
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(false);
    const wrapper = mount(AppSettingsTheme);
    const buttons = wrapper.findAll("button");
    expect(buttons[1].classes()).toContain("is-active");
    expect(buttons[0].classes()).not.toContain("is-active");
    expect(buttons[2].classes()).not.toContain("is-active");
  });

  it("marks Dunkel button active when isDarkMode is true", async () => {
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(true);
    const wrapper = mount(AppSettingsTheme);
    const buttons = wrapper.findAll("button");
    expect(buttons[2].classes()).toContain("is-active");
    expect(buttons[0].classes()).not.toContain("is-active");
    expect(buttons[1].classes()).not.toContain("is-active");
  });

  it("calls setDarkMode(null) when System clicked", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    const wrapper = mount(AppSettingsTheme);
    await wrapper.findAll("button")[0].trigger("click");
    expect(setDarkMode).toHaveBeenCalledWith(null);
  });

  it("calls setDarkMode(false) when Hell clicked", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    const wrapper = mount(AppSettingsTheme);
    await wrapper.findAll("button")[1].trigger("click");
    expect(setDarkMode).toHaveBeenCalledWith(false);
  });

  it("calls setDarkMode(true) when Dunkel clicked", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    const wrapper = mount(AppSettingsTheme);
    await wrapper.findAll("button")[2].trigger("click");
    expect(setDarkMode).toHaveBeenCalledWith(true);
  });

  it("tracks analytics event on theme change", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(AppSettingsTheme);
    await wrapper.findAll("button")[2].trigger("click");
    expect(trackEvent).toHaveBeenCalledWith("Color Mode", "Dark Mode", "Settings");
  });

  it("tracks System analytics event", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(AppSettingsTheme);
    await wrapper.findAll("button")[0].trigger("click");
    expect(trackEvent).toHaveBeenCalledWith("Color Mode", "System", "Settings");
  });
});
