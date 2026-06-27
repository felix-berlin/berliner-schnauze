import WordOfTheDay from "@components/WordOfTheDay.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

const mockWordOfTheDay = ref<{
  loading: boolean;
  error: boolean;
  word: { berlinerisch: string; post_name: string } | null;
}>({
  loading: false,
  error: false,
  word: { berlinerisch: "Kiez", post_name: "kiez" },
});

vi.mock("@stores/wordOfTheDay.ts", () => ({
  $wordOfTheDay: {},
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => mockWordOfTheDay),
}));

vi.mock("@components/ConfettiEffect.vue", () => ({
  default: { template: "<div class='mock-confetti' />" },
}));

vi.mock("@components/SingleLoader.vue", () => ({
  default: { template: "<div class='mock-loader' />" },
}));

vi.mock("@utils/helpers.ts", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, routeToWord: (slug: string) => `/wort/${slug}` };
});

const mountComponent = () =>
  mount(WordOfTheDay, {
    global: {
      directives: { tooltip: () => {} },
    },
  });

describe("WordOfTheDay.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWordOfTheDay.value = {
      loading: false,
      error: false,
      word: { berlinerisch: "Kiez", post_name: "kiez" },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders .c-word-of-the-day container", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day").exists()).toBe(true);
  });

  it("renders the crown icon", () => {
    const wrapper = mountComponent();
    expect(wrapper.find("[data-testid='icon-lucide-crown']").exists()).toBe(true);
  });

  it("shows 'Wort des Tages' headline", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day__headline").text()).toBe("Wort des Tages");
  });

  it("renders the word link when loaded", () => {
    const wrapper = mountComponent();
    expect(wrapper.find("a.c-word-of-the-day__word").text()).toBe("Kiez");
  });

  it("word link has correct href", () => {
    const wrapper = mountComponent();
    expect(wrapper.find("a.c-word-of-the-day__word").attributes("href")).toBe("/wort/kiez");
  });

  it("shows loader when loading is true", () => {
    mockWordOfTheDay.value = { loading: true, error: false, word: null };
    const wrapper = mountComponent();
    expect(wrapper.find(".mock-loader").exists()).toBe(true);
    expect(wrapper.find("a.c-word-of-the-day__word").exists()).toBe(false);
  });

  it("shows error message when error is true", () => {
    mockWordOfTheDay.value = { loading: false, error: true, word: null };
    const wrapper = mountComponent();
    expect(wrapper.find(".is-error").exists()).toBe(true);
    expect(wrapper.find(".is-error").text()).toContain("Fehler aufgetreten");
  });

  it("does not show error block when error is false", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".is-error").exists()).toBe(false);
  });

  it("shows countdown update element", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day__update").text()).toContain("Neues Wort in:");
  });

  it("shows confetti on mouseover", async () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".mock-confetti").exists()).toBe(false);
    await wrapper.trigger("mouseover");
    expect(wrapper.find(".mock-confetti").exists()).toBe(true);
  });

  it("hides confetti on mouseout", async () => {
    const wrapper = mountComponent();
    await wrapper.trigger("mouseover");
    await wrapper.trigger("mouseout");
    expect(wrapper.find(".mock-confetti").exists()).toBe(false);
  });

  it("shows confetti on focus", async () => {
    const wrapper = mountComponent();
    await wrapper.trigger("focus");
    expect(wrapper.find(".mock-confetti").exists()).toBe(true);
  });

  it("hides confetti on blur", async () => {
    const wrapper = mountComponent();
    await wrapper.trigger("focus");
    await wrapper.trigger("blur");
    expect(wrapper.find(".mock-confetti").exists()).toBe(false);
  });

  it("renders word-of-the-day__content", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day__content").exists()).toBe(true);
  });

  it("updates countdown display after first tick", async () => {
    const wrapper = mountComponent();
    // The countdown is initialized with "00" values; after 1 second it runs resetAtMidnight / convertMsToTime
    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    // Countdown spans should still be present — values are derived from real time
    expect(wrapper.findAll(".c-word-of-the-day__update span")).toHaveLength(3);
  });

  it("countdown spans render two-digit strings", async () => {
    const wrapper = mountComponent();
    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    const spans = wrapper.findAll(".c-word-of-the-day__update span");
    spans.forEach((span) => {
      expect(span.text()).toMatch(/^\d{2}$/);
    });
  });
});
