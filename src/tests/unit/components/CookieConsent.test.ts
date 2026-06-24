import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("vanilla-cookieconsent/dist/cookieconsent.css", () => ({}));

const { runMock, showPreferencesMock } = vi.hoisted(() => ({
  runMock: vi.fn(),
  showPreferencesMock: vi.fn(),
}));

vi.mock("vanilla-cookieconsent", () => ({
  __v_isRef: false,
  __v_isShallow: false,
  run: runMock,
  showPreferences: showPreferencesMock,
}));

describe("CookieConsent.vue", () => {
  it("renders button with text Cookie Einstellungen", async () => {
    const CookieConsentComponent = (await import("@components/CookieConsent.vue")).default;
    const wrapper = mount(CookieConsentComponent);
    expect(wrapper.find("button").text()).toBe("Cookie Einstellungen");
  });

  it("button click calls CookieConsent.showPreferences()", async () => {
    showPreferencesMock.mockClear();
    const CookieConsentComponent = (await import("@components/CookieConsent.vue")).default;
    const wrapper = mount(CookieConsentComponent);
    await wrapper.find("button").trigger("click");
    expect(showPreferencesMock).toHaveBeenCalled();
  });
});
