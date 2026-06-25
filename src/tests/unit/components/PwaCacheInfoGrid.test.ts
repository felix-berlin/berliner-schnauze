import PwaCacheInfoGrid from "@components/PwaCacheInfoGrid.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const defaultProps = {
  swInfo: { status: "active" as const, scriptURL: "/sw.js", scope: "/" },
  swStatusLabel: "Aktiv",
  swStatusIcon: null,
  swScriptURL: null,
  isPwaInstalled: false,
  storageQuota: null,
  storageQuotaPercent: 0,
};

describe("PwaCacheInfoGrid", () => {
  it("renders SW status label", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.text()).toContain("Aktiv");
  });

  it("applies SW status class", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find(".c-pwa-cache__info-value").classes()).toContain("is-sw-active");
  });

  it("shows script URL when provided", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swScriptURL: "/sw.js" },
    });
    expect(wrapper.find(".c-pwa-cache__info-sub").text()).toContain("/sw.js");
  });

  it("hides script URL when null", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find(".c-pwa-cache__info-sub").exists()).toBe(false);
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

  it("shows quota progressbar when storageQuota provided", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, storageQuota: { usedBytes: 500, quotaBytes: 1000 }, storageQuotaPercent: 50 },
    });
    const bar = wrapper.find("[role='progressbar']");
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("aria-valuenow")).toBe("50");
  });

  it("hides quota row when storageQuota is null", () => {
    const wrapper = mount(PwaCacheInfoGrid, { props: defaultProps });
    expect(wrapper.find("[role='progressbar']").exists()).toBe(false);
  });

  it("truncates long SW script URLs", () => {
    const longUrl = "https://example.com/" + "a".repeat(60);
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swScriptURL: longUrl },
    });
    expect(wrapper.find(".c-pwa-cache__info-sub").text().length).toBeLessThan(65);
    expect(wrapper.find(".c-pwa-cache__info-sub").text()).toContain("…");
  });

  it("shows is-sw-unknown class when swInfo is null (covers line 5 ?. null branch)", () => {
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swInfo: null },
    });
    expect(wrapper.find(".c-pwa-cache__info-value").classes()).toContain("is-sw-unknown");
  });

  it("renders swStatusIcon component when provided (covers line 6 v-if true branch)", () => {
    const IconStub = { template: "<svg data-testid='icon' />" };
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swStatusIcon: IconStub as any },
    });
    expect(wrapper.find("[data-testid='icon']").exists()).toBe(true);
  });

  it("truncates long non-URL script path in catch branch (covers lines 55-56 catch true branch)", () => {
    const longRelativePath = "/" + "a".repeat(60);
    const wrapper = mount(PwaCacheInfoGrid, {
      props: { ...defaultProps, swScriptURL: longRelativePath },
    });
    const subText = wrapper.find(".c-pwa-cache__info-sub").text();
    expect(subText).toContain("…");
    expect(subText.length).toBeLessThan(65);
  });
});
