import WordOfTheDay from "@components/WordOfTheDay.vue";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

const mockWordOfTheDay = ref<{
  loading: boolean;
  error: boolean;
  timestamp?: number;
  word: { berlinerisch: string; expires?: number; slug: string } | null;
}>({
  error: false,
  loading: false,
  timestamp: 0,
  word: { berlinerisch: "Kiez", slug: "kiez" },
});

const { getWordOfTheDay } = vi.hoisted(() => ({ getWordOfTheDay: vi.fn() }));

vi.mock("@stores/wordOfTheDay.ts", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { $wordOfTheDay: {}, expiresAt: actual.expiresAt, getWordOfTheDay };
});

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

// Every mount reads the same store ref: an old one left mounted would count down too.
enableAutoUnmount(afterEach);

describe("WordOfTheDay.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getWordOfTheDay.mockClear();
    mockWordOfTheDay.value = {
      error: false,
      loading: false,
      timestamp: 0,
      word: { berlinerisch: "Kiez", slug: "kiez" },
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
    expect(wrapper.find(".c-word-of-the-day .headline").text()).toBe("Wort des Tages");
  });

  it("renders the word link when loaded", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day a.word").text()).toBe("Kiez");
  });

  it("word link has correct href", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day a.word").attributes("href")).toBe("/wort/kiez");
  });

  it("shows loader when loading is true", () => {
    mockWordOfTheDay.value = { error: false, loading: true, word: null };
    const wrapper = mountComponent();
    expect(wrapper.find(".mock-loader").exists()).toBe(true);
    expect(wrapper.find(".c-word-of-the-day a.word").exists()).toBe(false);
  });

  it("shows error message when error is true", () => {
    mockWordOfTheDay.value = { error: true, loading: false, word: null };
    const wrapper = mountComponent();
    expect(wrapper.find('[data-state="error"]').exists()).toBe(true);
    expect(wrapper.find('[data-state="error"]').text()).toContain("Fehler aufgetreten");
  });

  it("does not show error block when error is false", () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-state="error"]').exists()).toBe(false);
  });

  it("shows countdown update element", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day .update").text()).toContain("Neues Wort in:");
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

  it("shows confetti while the word link has focus", async () => {
    const wrapper = mountComponent();
    await wrapper.trigger("focusin");
    expect(wrapper.find(".mock-confetti").exists()).toBe(true);
  });

  it("hides confetti when focus leaves", async () => {
    const wrapper = mountComponent();
    await wrapper.trigger("focusin");
    await wrapper.trigger("focusout");
    expect(wrapper.find(".mock-confetti").exists()).toBe(false);
  });

  it("renders word-of-the-day__content", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".c-word-of-the-day .content").exists()).toBe(true);
  });

  it("updates countdown display after first tick", async () => {
    const wrapper = mountComponent();
    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    // Countdown spans should still be present — values are derived from real time
    expect(wrapper.findAll(".c-word-of-the-day .update span")).toHaveLength(3);
  });

  it("countdown spans render two-digit strings", async () => {
    const wrapper = mountComponent();
    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    const spans = wrapper.findAll(".c-word-of-the-day .update span");
    spans.forEach((span) => {
      expect(span.text()).toMatch(/^\d{2}$/);
    });
  });

  it("counts down to the server's expiry (Berlin midnight), not local midnight", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    mockWordOfTheDay.value = {
      error: false,
      loading: false,
      timestamp: Date.now(),
      word: { berlinerisch: "Kiez", expires: 3690, slug: "kiez" },
    };
    const wrapper = mountComponent();
    const spans = wrapper.findAll(".c-word-of-the-day .update span").map((s) => s.text());
    expect(spans).toEqual(["01", "01", "30"]);
  });

  it("fetches the next word when the countdown reaches zero", async () => {
    mockWordOfTheDay.value = {
      error: false,
      loading: false,
      timestamp: Date.now(),
      word: { berlinerisch: "Kiez", expires: 2, slug: "kiez" },
    };
    const wrapper = mountComponent();
    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(getWordOfTheDay).toHaveBeenCalledTimes(1);
  });
});
