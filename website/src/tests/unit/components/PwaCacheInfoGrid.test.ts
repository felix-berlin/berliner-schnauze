import PwaCacheInfoGrid from "@components/PwaCacheInfoGrid.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const defaultProps = {
  isPwaInstalled: false,
  storageQuota: null,
  swInfo: { scope: "/", scriptURL: "/sw.js", status: "active" as const },
};

describe("PwaCacheInfoGrid", () => {
  it("renders SW status label", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.text()).toContain("Aktiv");
  });

  it.each([
    ["installing", "Wird installiert", "loader"],
    ["waiting", "Wartend", "clock"],
    ["not-registered", "Nicht registriert", "circle"],
    ["not-supported", "Nicht unterstützt", "circle-x"],
    ["active", "Aktiv", "circle-check"],
  ] as const)("renders label and icon for status %s", async (status, label, icon) => {
    const swInfo =
      status === "not-registered" || status === "not-supported"
        ? { status }
        : { scope: "/", scriptURL: "/sw.js", status };
    const wrapper = mount(PwaCacheInfoGrid, { props: { ...defaultProps, swInfo } });
    await vi.dynamicImportSettled();
    await flushPromises();
    expect(wrapper.text()).toContain(label);
    expect(wrapper.find(`[data-testid='icon-lucide-${icon}']`).exists()).toBe(true);
  });

  it("applies SW status class", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find(".c-pwa-cache__info-value").classes()).toContain("is-sw-active");
  });

  it("shows script URL from swInfo", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find(".c-pwa-cache__info-sub").text()).toBe("/sw.js");
  });

  it("hides script URL when it is empty", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swInfo: { scope: "/", scriptURL: "", status: "active" } },
    });
    expect(wrapper.find(".c-pwa-cache__info-sub").exists()).toBe(false);
  });

  it("hides script URL when swInfo has none", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swInfo: { status: "not-registered" } },
    });
    expect(wrapper.find(".c-pwa-cache__info-sub").exists()).toBe(false);
  });

  it("truncates long SW script URLs", () => {
    const scriptURL = "https://example.com/" + "a".repeat(60);
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swInfo: { scope: "/", scriptURL, status: "active" } },
    });
    const subText = wrapper.find(".c-pwa-cache__info-sub").text();
    expect(subText).toContain("…");
    expect(subText.length).toBeLessThan(65);
  });

  it("shows installed state", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, isPwaInstalled: true },
    });
    expect(wrapper.text()).toContain("✓ Installiert");
    const appStatus = wrapper.findAll(".c-pwa-cache__info-value")[1];
    expect(appStatus.classes()).toContain("is-installed");
  });

  it("shows not-installed state", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.text()).toContain("Nicht installiert");
  });

  it("computes the quota percentage for the progressbar", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, storageQuota: { quotaBytes: 1000, usedBytes: 500 } },
    });
    const bar = wrapper.find("[role='progressbar']");
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("aria-valuenow")).toBe("50");
  });

  it("shows 0% when the quota is 0 bytes", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, storageQuota: { quotaBytes: 0, usedBytes: 0 } },
    });
    expect(wrapper.find("[role='progressbar']").attributes("aria-valuenow")).toBe("0");
  });

  it("hides quota row when storageQuota is null", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find("[role='progressbar']").exists()).toBe(false);
  });

  it("shows is-sw-unknown class and placeholder label when swInfo is null", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swInfo: null },
    });
    expect(wrapper.find(".c-pwa-cache__info-value").classes()).toContain("is-sw-unknown");
    expect(wrapper.text()).toContain("…");
  });
});
