import CookieConsentComponent from "@components/CookieConsent.vue";
import { mount } from "@vue/test-utils";
import * as CookieConsent from "vanilla-cookieconsent";
import { describe, expect, it, vi } from "vitest";

vi.mock("vanilla-cookieconsent", () => ({
  __v_isRef: false,
  run: vi.fn(),
  showPreferences: vi.fn(),
}));

describe("CookieConsent.vue", () => {
  it("initializes cookie consent config", () => {
    mount(CookieConsentComponent);

    expect(vi.mocked(CookieConsent.run)).toHaveBeenCalledTimes(1);
  });

  it("opens preferences when button is clicked", async () => {
    const wrapper = mount(CookieConsentComponent);

    await wrapper.get("button").trigger("click");

    expect(vi.mocked(CookieConsent.showPreferences)).toHaveBeenCalledTimes(1);
  });
});