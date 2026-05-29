import PwaCacheTypeBar from "@components/PwaCacheTypeBar.vue";
import type { CacheBucket } from "@composables/useCacheStorage";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

function makeBucket(typeBreakdown: CacheBucket["typeBreakdown"]): CacheBucket {
  return {
    lastModified: null,
    name: "test",
    oldestEntry: null,
    totalSizeBytes: 0,
    typeBreakdown,
    urls: [],
  };
}

describe("PwaCacheTypeBar", () => {
  it("renders nothing when no buckets", () => {
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets: [] } });
    expect(wrapper.find(".c-pwa-type-bar").exists()).toBe(false);
  });

  it("renders nothing when all typeBreakdowns are empty", () => {
    const wrapper = mount(PwaCacheTypeBar, {
      props: { buckets: [makeBucket([])] },
    });
    expect(wrapper.find(".c-pwa-type-bar").exists()).toBe(false);
  });

  it("renders track and legend when data present", () => {
    const bucket = makeBucket([
      { count: 5, sizeBytes: 500, type: "js" },
      { count: 3, sizeBytes: 300, type: "css" },
    ]);
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-type-bar__track").exists()).toBe(true);
    expect(wrapper.findAll(".c-pwa-type-bar__segment")).toHaveLength(2);
    expect(wrapper.findAll(".c-pwa-type-bar__legend-item")).toHaveLength(2);
  });

  it("aggregates types across multiple buckets", () => {
    const buckets = [
      makeBucket([{ count: 1, sizeBytes: 200, type: "js" }]),
      makeBucket([{ count: 1, sizeBytes: 300, type: "js" }]),
    ];
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets } });
    expect(wrapper.findAll(".c-pwa-type-bar__segment")).toHaveLength(1);
    expect(wrapper.find(".c-pwa-type-bar__legend-item").text()).toContain("JS");
  });

  it("shows type labels uppercased", () => {
    const bucket = makeBucket([{ count: 1, sizeBytes: 100, type: "avif" }]);
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets: [bucket] } });
    expect(wrapper.find(".c-pwa-type-bar__legend-type").text()).toBe("AVIF");
  });

  it("groups types beyond MAX into sonstige", () => {
    const types = ["js", "css", "avif", "webp", "woff2", "html", "json", "png"].map(
      (type, i) => ({ count: 1, sizeBytes: 100 - i * 10, type }),
    );
    const bucket = makeBucket(types);
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets: [bucket] } });
    const labels = wrapper.findAll(".c-pwa-type-bar__legend-type").map((el) => el.text());
    expect(labels).toContain("SONSTIGE");
    expect(labels.length).toBeLessThanOrEqual(8);
  });

  it("assigns unique colors to each segment", () => {
    const bucket = makeBucket([
      { count: 1, sizeBytes: 100, type: "js" },
      { count: 1, sizeBytes: 80, type: "css" },
    ]);
    const wrapper = mount(PwaCacheTypeBar, { props: { buckets: [bucket] } });
    const segments = wrapper.findAll(".c-pwa-type-bar__segment");
    const colors = segments.map((s) => s.attributes("style"));
    expect(colors[0]).not.toBe(colors[1]);
  });
});
