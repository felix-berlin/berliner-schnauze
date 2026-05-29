import PwaCacheBucketList from "@components/PwaCacheBucketList.vue";
import type { CacheBucket } from "@composables/useCacheStorage";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

function makeBucket(name: string, urls: string[] = [], sizeBytes = 1024): CacheBucket {
  return {
    name,
    totalSizeBytes: sizeBytes,
    lastModified: new Date("2026-01-15T12:00:00Z"),
    oldestEntry: new Date("2026-01-01T12:00:00Z"),
    urls,
  };
}

describe("PwaCacheBucketList", () => {
  it("renders bucket display names", () => {
    const buckets = [makeBucket("workbox-precache-v2", ["https://example.com/app.js"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-name").text()).toBe("App-Dateien");
  });

  it("renders bucket size formatted", () => {
    const buckets = [makeBucket("api-search-index", ["https://example.com/x"], 2048)];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-size").text()).toContain("2,0 KB");
  });

  it("renders url count in meta", () => {
    const urls = ["https://a.com/1", "https://a.com/2", "https://a.com/3"];
    const buckets = [makeBucket("api-search-index", urls)];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("3 Einträge");
  });

  it('uses "Eintrag" singular for 1 URL', () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com/1"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("1 Eintrag");
  });

  it("renders multiple buckets", () => {
    const buckets = [
      makeBucket("workbox-precache-v2", ["https://a.com"]),
      makeBucket("api-search-index", ["https://b.com"]),
    ];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.findAll(".c-pwa-cache__bucket")).toHaveLength(2);
  });

  it("disables accordion item when bucket has no URLs", () => {
    const buckets = [makeBucket("api-search-index", [])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-disabled");
  });

  it("emits clear-bucket with bucket name on delete click", async () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    await wrapper.find(".c-pwa-cache__bucket-delete").trigger("click");
    expect(wrapper.emitted("clear-bucket")).toEqual([["api-search-index"]]);
  });

  it("expands URLs on header click", async () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com/path"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-open");
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
  });

  it("shows formatted URL paths in expanded content", async () => {
    const buckets = [makeBucket("api-search-index", ["https://example.com/some/path"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url").text()).toContain("/some/path");
  });

  it("shows relative date in meta", () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("neu:");
  });
});
