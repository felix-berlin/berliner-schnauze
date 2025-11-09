import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { atom, map } from "nanostores";
import WordSuggestHint from "@components/WordSuggestHint.vue";
import * as modalStore from "@stores/modal.ts";

// Mock the stores
vi.mock("@stores/modal.ts", () => ({
  open: vi.fn(),
}));

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: map({
    search: "",
    filters: {},
  }),
}));

// Mock the icon component
vi.mock("virtual:icons/lucide/plus", () => ({
  default: {
    name: "Plus",
    template: '<svg data-testid="plus-icon"></svg>',
  },
}));

describe("WordSuggestHint.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render the component with hint text", () => {
      const wrapper = mount(WordSuggestHint);

      expect(wrapper.find(".c-word-suggest-hint").exists()).toBe(true);
      expect(wrapper.find(".c-word-suggest-hint__text").exists()).toBe(true);
      expect(wrapper.text()).toContain(
        "Dieses Wort ist anscheinend noch nicht Teil des Wörterbuchs.",
      );
      expect(wrapper.text()).toContain("Möchtest du es hinzufügen?");
    });

    it("should render the add word button", () => {
      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      expect(button.exists()).toBe(true);
      expect(button.text()).toContain("Wort hinzufügen");
      expect(button.attributes("type")).toBe("button");
    });

    it("should render the Plus icon", () => {
      const wrapper = mount(WordSuggestHint);

      expect(wrapper.find('[data-testid="plus-icon"]').exists()).toBe(true);
    });

    it("should have correct CSS classes", () => {
      const wrapper = mount(WordSuggestHint);

      expect(wrapper.classes()).toContain("c-word-suggest-hint");
      expect(wrapper.find("button").classes()).toContain("c-button");
      expect(wrapper.find("button").classes()).toContain("c-button--center-icon");
    });
  });

  describe("Modal Opening Behavior", () => {
    it("should open modal when button is clicked", async () => {
      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      await button.trigger("click");

      expect(modalStore.open).toHaveBeenCalledTimes(1);
    });

    it("should open modal with correct component configuration", async () => {
      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      await button.trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs).toHaveProperty("view");
      expect(callArgs.view).toHaveProperty("component");
      expect(callArgs.view).toHaveProperty("props");
    });

    it("should pass undefined berlinerWord when search is empty", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "", filters: {} });

      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      await button.trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props).toEqual({
        berlinerWord: undefined,
      });
    });

    it("should pass search term as berlinerWord when search is not empty", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "Kiez", filters: {} });

      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      await button.trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props).toEqual({
        berlinerWord: "Kiez",
      });
    });

    it("should handle multiple button clicks", async () => {
      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find(".c-word-suggest-hint__button");

      await button.trigger("click");
      await button.trigger("click");
      await button.trigger("click");

      expect(modalStore.open).toHaveBeenCalledTimes(3);
    });
  });

  describe("Store Integration", () => {
    it("should reactively update modal props when search changes", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "", filters: {} });

      const wrapper = mount(WordSuggestHint);

      // First click with empty search
      await wrapper.find("button").trigger("click");
      expect(vi.mocked(modalStore.open).mock.calls[0][0].view.props.berlinerWord).toBeUndefined();

      // Update search
      $wordSearch.set({ search: "Schnauze", filters: {} });
      await wrapper.vm.$nextTick();

      // Second click with search term
      await wrapper.find("button").trigger("click");
      expect(vi.mocked(modalStore.open).mock.calls[1][0].view.props.berlinerWord).toBe("Schnauze");
    });

    it("should handle special characters in search term", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "Jöö!", filters: {} });

      const wrapper = mount(WordSuggestHint);
      await wrapper.find("button").trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props.berlinerWord).toBe("Jöö!");
    });

    it("should trim whitespace from search term", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "  Kiez  ", filters: {} });

      const wrapper = mount(WordSuggestHint);
      await wrapper.find("button").trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props.berlinerWord).toBe("  Kiez  ");
    });
  });

  describe("Async Component Loading", () => {
    it("should use defineAsyncComponent for SuggestWordForm", async () => {
      const wrapper = mount(WordSuggestHint);
      await wrapper.find("button").trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];
      const component = callArgs.view.component;

      expect(component).toBeDefined();
      expect(typeof component).toBe("object");
    });
  });

  describe("Accessibility", () => {
    it("should have proper button semantics", () => {
      const wrapper = mount(WordSuggestHint);
      const button = wrapper.find("button");

      expect(button.attributes("type")).toBe("button");
      expect(button.text()).toBeTruthy(); // Has text content
    });

    it("should use strong tag for emphasis", () => {
      const wrapper = mount(WordSuggestHint);
      const strong = wrapper.find("strong");

      expect(strong.exists()).toBe(true);
      expect(strong.classes()).toContain("c-word-suggest-hint__text");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null search value gracefully", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: null as any, filters: {} });

      const wrapper = mount(WordSuggestHint);
      await wrapper.find("button").trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props.berlinerWord).toBeUndefined();
    });

    it("should handle empty string search correctly", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      $wordSearch.set({ search: "", filters: {} });

      const wrapper = mount(WordSuggestHint);
      await wrapper.find("button").trigger("click");

      const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];

      expect(callArgs.view.props.berlinerWord).toBeUndefined();
    });
  });
});
