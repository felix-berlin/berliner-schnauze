import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchRef = ref({ berolinismus: false });
const mockToggle = vi.fn();

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => searchRef),
  useVModel: vi.fn(() => ref(undefined)),
}));

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
  $toggleBerolinismus: mockToggle,
  setLetterFilter: vi.fn(),
}));

vi.mock("virtual:icons/lucide/paw-print", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

describe("BerolinismusToggle.vue", () => {
  beforeEach(() => {
    vi.resetModules();
    searchRef.value = { berolinismus: false };
    mockToggle.mockClear();
  });

  it("renders button with text Berolinimus", async () => {
    const BerolinismusToggle = (await import("@components/filter/BerolinismusToggle.vue")).default;
    const wrapper = mount(BerolinismusToggle);
    expect(wrapper.find("button").exists()).toBe(true);
    expect(wrapper.text()).toContain("Berolinimus");
  });

  it("does not have is-active when berolinismus is false", async () => {
    searchRef.value = { berolinismus: false };
    const BerolinismusToggle = (await import("@components/filter/BerolinismusToggle.vue")).default;
    const wrapper = mount(BerolinismusToggle);
    expect(wrapper.find("button").classes()).not.toContain("is-active");
  });

  it("has is-active when berolinismus is true", async () => {
    searchRef.value = { berolinismus: true };
    const BerolinismusToggle = (await import("@components/filter/BerolinismusToggle.vue")).default;
    const wrapper = mount(BerolinismusToggle);
    expect(wrapper.find("button").classes()).toContain("is-active");
  });

  it("clicking calls $toggleBerolinismus", async () => {
    const BerolinismusToggle = (await import("@components/filter/BerolinismusToggle.vue")).default;
    const wrapper = mount(BerolinismusToggle);
    await wrapper.find("button").trigger("click");
    expect(mockToggle).toHaveBeenCalledOnce();
  });
});
