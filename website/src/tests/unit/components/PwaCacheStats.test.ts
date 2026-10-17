import PwaCacheStats from "@components/PwaCacheStats.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("PwaCacheStats", () => {
  it("renders bucket count", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 3, storageQuota: null, totalEntryCount: 0, totalSizeBytes: 0 },
    });
    expect(wrapper.find(".c-pwa-cache__stat-value").text()).toBe("3");
  });

  it('uses "Cache" singular for bucketCount 1', () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, storageQuota: null, totalEntryCount: 0, totalSizeBytes: 0 },
    });
    expect(wrapper.text()).toContain("Cache gecacht");
    expect(wrapper.text()).not.toContain("Caches gecacht");
  });

  it('uses "Caches" plural for bucketCount > 1', () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 2, storageQuota: null, totalEntryCount: 0, totalSizeBytes: 0 },
    });
    expect(wrapper.text()).toContain("Caches gecacht");
  });

  it("renders totalEntryCount", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, storageQuota: null, totalEntryCount: 42, totalSizeBytes: 0 },
    });
    expect(wrapper.text()).toContain("42");
    expect(wrapper.text()).toContain("Einträge gesamt");
  });

  it('uses "Eintrag" singular for totalEntryCount 1', () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, storageQuota: null, totalEntryCount: 1, totalSizeBytes: 0 },
    });
    expect(wrapper.text()).toContain("Eintrag gesamt");
    expect(wrapper.text()).not.toContain("Einträge gesamt");
  });

  it("formats totalSizeBytes in KB", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, storageQuota: null, totalEntryCount: 0, totalSizeBytes: 2048 },
    });
    expect(wrapper.text()).toContain("2,0 KB");
  });

  it("shows quota stat when storageQuota provided", () => {
    const wrapper = mount(PwaCacheStats, {
      props: {
        bucketCount: 1,
        storageQuota: { quotaBytes: 10_240, usedBytes: 1024 },
        totalEntryCount: 0,
        totalSizeBytes: 0,
      },
    });
    expect(wrapper.text()).toContain("belegt");
    expect(wrapper.findAll(".c-pwa-cache__stat")).toHaveLength(4);
  });

  it("hides quota stat when storageQuota is null", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, storageQuota: null, totalEntryCount: 0, totalSizeBytes: 0 },
    });
    expect(wrapper.text()).not.toContain("belegt");
    expect(wrapper.findAll(".c-pwa-cache__stat")).toHaveLength(3);
  });

  it("quotaPercent returns 0 when quotaBytes is 0 (covers line 62 quotaBytes===0 branch)", () => {
    const wrapper = mount(PwaCacheStats, {
      props: {
        bucketCount: 1,
        storageQuota: { quotaBytes: 0, usedBytes: 0 },
        totalEntryCount: 0,
        totalSizeBytes: 0,
      },
    });
    expect(wrapper.find(".c-pwa-cache__stat--quota .c-pwa-cache__stat-value").text()).toBe("0%");
  });
});
