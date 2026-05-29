import PwaCacheStats from "@components/PwaCacheStats.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("PwaCacheStats", () => {
  it("renders bucket count", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 3, totalSizeBytes: 0, storageQuota: null },
    });
    expect(wrapper.find(".c-pwa-cache__stat-value").text()).toBe("3");
  });

  it('uses "Cache" singular for bucketCount 1', () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, totalSizeBytes: 0, storageQuota: null },
    });
    expect(wrapper.text()).toContain("Cache gecacht");
    expect(wrapper.text()).not.toContain("Caches gecacht");
  });

  it('uses "Caches" plural for bucketCount > 1', () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 2, totalSizeBytes: 0, storageQuota: null },
    });
    expect(wrapper.text()).toContain("Caches gecacht");
  });

  it("formats totalSizeBytes in KB", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, totalSizeBytes: 2048, storageQuota: null },
    });
    expect(wrapper.text()).toContain("2,0 KB");
  });

  it("shows quota stat when storageQuota provided", () => {
    const wrapper = mount(PwaCacheStats, {
      props: {
        bucketCount: 1,
        totalSizeBytes: 0,
        storageQuota: { usedBytes: 1024, quotaBytes: 10240 },
      },
    });
    expect(wrapper.text()).toContain("belegt");
    expect(wrapper.findAll(".c-pwa-cache__stat")).toHaveLength(3);
  });

  it("hides quota stat when storageQuota is null", () => {
    const wrapper = mount(PwaCacheStats, {
      props: { bucketCount: 1, totalSizeBytes: 0, storageQuota: null },
    });
    expect(wrapper.text()).not.toContain("belegt");
    expect(wrapper.findAll(".c-pwa-cache__stat")).toHaveLength(2);
  });
});
