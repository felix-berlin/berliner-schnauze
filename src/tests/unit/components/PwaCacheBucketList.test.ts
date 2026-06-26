import PwaCacheBucketList from "@components/PwaCacheBucketList.vue";
import type { CacheBucket } from "@composables/useCacheStorage";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("virtua/vue", () => ({
  VList: {
    props: ["data", "style", "class"],
    setup(props: { data: unknown[] }, { slots }: { slots: any }) {
      return () => props.data.map((item: unknown, index: number) => slots.default?.({ item, index }));
    },
  },
}));

function makeBucket(name: string, urls: string[] = [], sizeBytes = 1024): CacheBucket {
  return {
    dateRange: { lastModified: new Date("2026-01-15T12:00:00Z"), oldestEntry: new Date("2026-01-01T12:00:00Z") },
    name,
    totalSizeBytes: sizeBytes,
    typeBreakdown: [],
    urls: urls.map((url) => ({ contentType: null, date: null, size: null, url })),
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
    expect(wrapper.find(".c-pwa-cache__url-path").text()).toContain("/some/path");
  });

  it("shows age for entry with date", async () => {
    const bucket: CacheBucket = {
      dateRange: { lastModified: new Date("2026-01-15T12:00:00Z"), oldestEntry: new Date("2026-01-01T12:00:00Z") },
      name: "api-search-index",
      totalSizeBytes: 1024,
      typeBreakdown: [],
      urls: [{ contentType: null, date: new Date("2026-01-15T12:00:00Z"), size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-age").exists()).toBe(true);
  });

  it("omits age for entry without date", async () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com/x"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-age").exists()).toBe(false);
  });

  it("shows relative date in meta", () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("neu:");
  });

  it("shows formatted size for entry with size", async () => {
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 2048,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: 2048, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-size").text()).toContain("KB");
  });

  it("omits size span when entry size is null", async () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com/x"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-size").exists()).toBe(false);
  });

  it("shows known content type label uppercased", async () => {
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: "application/json", date: null, size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-type").text()).toBe("JSON");
  });

  it("shows extracted subtype for unknown content type", async () => {
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: "application/x-custom", date: null, size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-type").text()).toBe("X-CUSTOM");
  });

  it("renders type breakdown pills when typeBreakdown has items (covers line 51 v-if true branch)", () => {
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [{ type: "js", count: 12, sizeBytes: 5000 }],
      urls: [],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-cache__bucket-types").exists()).toBe(true);
    expect(wrapper.find(".c-pwa-cache__type-pill").text()).toContain("JS 12");
  });

  it("formatUrl falls back to raw url when URL() parsing throws (covers line 118 catch branch)", async () => {
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: "/relative-path-no-origin" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    expect(wrapper.find(".c-pwa-cache__url-path").text()).toContain("/relative-path-no-origin");
  });

  it("formatUrl truncates pathname longer than 60 chars (covers line 116 true branch)", async () => {
    const longPath = "/very/long/path/that/exceeds/sixty/characters/totally/yes/1234567890";
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: `https://example.com${longPath}` }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    const text = wrapper.find(".c-pwa-cache__url-path").text();
    expect(text).toContain("…");
    expect(text.length).toBeLessThan(longPath.length);
  });

  it("formatUrl truncates long relative url in catch branch (covers line 118 true branch)", async () => {
    const longRelative = "/relative-path-that-is-over-sixty-characters-long-indeed-yes-1234";
    const bucket: CacheBucket = {
      dateRange: null,
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: longRelative }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    await wrapper.find(".c-pwa-cache__bucket-header").trigger("click");
    const text = wrapper.find(".c-pwa-cache__url-path").text();
    expect(text).toContain("…");
    expect(text.length).toBeLessThan(longRelative.length);
  });

  it("formatRelativeTime returns 'gerade eben' for date less than 1 minute ago (covers line 127)", () => {
    const bucket: CacheBucket = {
      dateRange: { lastModified: new Date(Date.now() - 10_000), oldestEntry: new Date(Date.now() - 10_000) },
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("gerade eben");
  });

  it("formatRelativeTime returns 'vor X Min.' for date 30 minutes ago (covers line 128)", () => {
    const bucket: CacheBucket = {
      dateRange: { lastModified: new Date(Date.now() - 30 * 60_000), oldestEntry: new Date(Date.now() - 30 * 60_000) },
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("Min.");
  });

  it("clicking AccordionTrigger button does not propagate to header (covers L21 @click.stop handler)", async () => {
    const buckets = [makeBucket("api-search-index", ["https://a.com/path"])];
    const wrapper = mount(PwaCacheBucketList, { props: { buckets } });
    // The accordion trigger button carries the @click.stop compiled handler — trigger it directly
    const trigger = wrapper.find(".c-accordion__trigger");
    expect(trigger.exists()).toBe(true);
    await trigger.trigger("click");
    // After clicking the trigger (which has @click.stop), the accordion item should now be open
    // because AccordionTrigger's own click handler toggles it — the stop modifier just prevents
    // the event from reaching the parent header div's handler a second time
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
  });

  it("formatRelativeTime returns 'vor X Std.' for date 5 hours ago (covers line 129)", () => {
    const bucket: CacheBucket = {
      dateRange: { lastModified: new Date(Date.now() - 5 * 3_600_000), oldestEntry: new Date(Date.now() - 5 * 3_600_000) },
      name: "api-search-index",
      totalSizeBytes: 0,
      typeBreakdown: [],
      urls: [{ contentType: null, date: null, size: null, url: "https://a.com/x" }],
    };
    const wrapper = mount(PwaCacheBucketList, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-cache__bucket-meta").text()).toContain("Std.");
  });
});
